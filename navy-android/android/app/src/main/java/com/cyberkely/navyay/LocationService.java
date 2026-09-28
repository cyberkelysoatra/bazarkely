package com.cyberkely.navyay;

import android.Manifest;
import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * NAVY ay phase 3B (decisions 25, 49, 50): the driver's position with the screen off.
 *
 * A foreground service (permanent notification "NAVY ay : votre position est partagée")
 * sends the position every 30 s (60 s when the battery is under 20 % and not charging)
 * straight to the database function navy_report_position, over HTTPS, with the account's
 * session (NavySession): nothing depends on the web page's JavaScript, which Android
 * freezes with the screen off. It runs ONLY while the web page says the driver is
 * available or has a course in progress, and stops at once when the server refuses a
 * position (not available any more: "Pas disponible", expiry, end of the course, idle
 * for an hour) or when the page stops it (sign-out, "Pas disponible" on screen).
 * The notification button "Pas disponible" sets the driver unavailable on the server.
 */
public class LocationService extends Service {
    static final String ACTION_START = "com.cyberkely.navyay.TRACK_START";
    static final String ACTION_STOP = "com.cyberkely.navyay.TRACK_STOP";
    static final String ACTION_UNAVAILABLE = "com.cyberkely.navyay.TRACK_UNAVAILABLE";
    static final String EXTRA_PARTNER = "partnerId";
    static final String EXTRA_MODE = "mode";

    static final int NOTIF_ID = 3301;
    static final long INTERVAL_MS = 30_000;
    static final long INTERVAL_LOW_BATTERY_MS = 60_000;

    private FusedLocationProviderClient fused;
    private LocationCallback callback;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private PowerManager.WakeLock wakeLock;
    private Location last;
    private long intervalMs = 0;
    private long lastSendStart = 0;
    private volatile boolean stopping = false;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (stopping) return;
            long wanted = batteryLow() ? INTERVAL_LOW_BATTERY_MS : INTERVAL_MS;
            if (wanted != intervalMs) requestUpdates(wanted);
            maybeSend(true);
            handler.postDelayed(this, 5_000);
        }
    };

    static void start(Context c, String partnerId, String mode) {
        Intent i = new Intent(c, LocationService.class).setAction(ACTION_START)
            .putExtra(EXTRA_PARTNER, partnerId).putExtra(EXTRA_MODE, mode);
        ContextCompat.startForegroundService(c, i);
    }

    static void stop(Context c, String reason) {
        SharedPreferences.Editor e = NavySession.prefs(c).edit();
        boolean was = NavySession.prefs(c).getBoolean(NavyStatus.K_TRACKING, false);
        e.putBoolean(NavyStatus.K_TRACKING, false);
        if (was) e.putLong(NavyStatus.K_STOPPED, System.currentTimeMillis()).putString(NavyStatus.K_STOP_REASON, reason);
        e.apply();
        c.stopService(new Intent(c, LocationService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        NavyNotifications.ensureChannels(this);
        fused = LocationServices.getFusedLocationProviderClient(this);
        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location l = result.getLastLocation();
                if (l == null) return;
                last = l;
                NavySession.prefs(LocationService.this).edit().putLong(NavyStatus.K_LAST_FIX, System.currentTimeMillis()).apply();
                maybeSend(false);
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        SharedPreferences prefs = NavySession.prefs(this);
        if (ACTION_STOP.equals(action)) {
            stop(this, "page");
            return START_NOT_STICKY;
        }
        if (ACTION_UNAVAILABLE.equals(action)) {
            startInForeground(prefs.getString(NavyStatus.K_MODE, "available"));
            setUnavailable();
            return START_STICKY;
        }
        String partnerId;
        String mode;
        if (ACTION_START.equals(action)) {
            partnerId = intent.getStringExtra(EXTRA_PARTNER);
            mode = intent.getStringExtra(EXTRA_MODE);
            boolean wasRunning = prefs.getBoolean(NavyStatus.K_TRACKING, false)
                && partnerId != null && partnerId.equals(prefs.getString(NavyStatus.K_PARTNER, null));
            SharedPreferences.Editor e = prefs.edit()
                .putBoolean(NavyStatus.K_TRACKING, true)
                .putString(NavyStatus.K_PARTNER, partnerId)
                .putString(NavyStatus.K_MODE, "course".equals(mode) ? "course" : "available");
            if (!wasRunning) {
                e.putLong(NavyStatus.K_STARTED, System.currentTimeMillis()).remove(NavyStatus.K_STOP_REASON).putLong(NavyStatus.K_STOPPED, 0);
            }
            e.apply();
        } else {
            // Restarted by Android (START_STICKY) after the process was killed.
            if (!prefs.getBoolean(NavyStatus.K_TRACKING, false)) {
                stopSelf();
                return START_NOT_STICKY;
            }
            partnerId = prefs.getString(NavyStatus.K_PARTNER, null);
            mode = prefs.getString(NavyStatus.K_MODE, "available");
            NavyStatus.log(this, "service restarted by Android");
        }
        if (partnerId == null) {
            stop(this, "no-partner");
            return START_NOT_STICKY;
        }
        if (!startInForeground(mode)) return START_NOT_STICKY;
        stopping = false;
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NavyAy:position");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(4 * 60 * 60 * 1000L); // safety: 4 h at most per start
        }
        requestUpdates(batteryLow() ? INTERVAL_LOW_BATTERY_MS : INTERVAL_MS);
        handler.removeCallbacks(tick);
        handler.postDelayed(tick, 5_000);
        return START_STICKY;
    }

    /** False when Android refuses the foreground service (location permission missing). */
    private boolean startInForeground(String mode) {
        Notification n = NavyNotifications.trackingNotification(this, "course".equals(mode));
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIF_ID, n);
            }
            return true;
        } catch (Exception e) {
            NavyStatus.log(this, "foreground refused: " + e.getClass().getSimpleName());
            stop(this, "permission");
            return false;
        }
    }

    private void requestUpdates(long ms) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            NavyStatus.log(this, "no location permission");
            stop(this, "permission");
            return;
        }
        try {
            fused.removeLocationUpdates(callback);
            LocationRequest req = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, ms)
                .setMinUpdateIntervalMillis(ms / 2)
                .setWaitForAccurateLocation(false)
                .build();
            fused.requestLocationUpdates(req, callback, Looper.getMainLooper());
            intervalMs = ms;
            NavySession.prefs(this).edit().putLong(NavyStatus.K_INTERVAL, ms).apply();
            NavyStatus.log(this, "location updates every " + (ms / 1000) + " s");
        } catch (SecurityException e) {
            stop(this, "permission");
        }
    }

    private boolean batteryLow() {
        Intent b = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (b == null) return false;
        int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        int status = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
        return !NavyRules.shouldSendFast(level, scale, charging);
    }

    /** Sends the latest position when the interval has elapsed since the previous send. */
    private void maybeSend(boolean fromTick) {
        if (stopping || last == null) return;
        long now = System.currentTimeMillis();
        long due = intervalMs > 0 ? intervalMs : INTERVAL_MS;
        // A little tolerance so that a fix arriving 1-2 s early is not skipped for a whole period.
        if (now - lastSendStart < due - 3_000) return;
        // Never send a position older than 2 minutes (no fix: the watchdog waits).
        long ageMs = (SystemClock.elapsedRealtimeNanos() - last.getElapsedRealtimeNanos()) / 1_000_000L;
        if (ageMs > 120_000) return;
        lastSendStart = now;
        final Location l = last;
        final String partnerId = NavySession.prefs(this).getString(NavyStatus.K_PARTNER, null);
        io.execute(() -> send(partnerId, l));
    }

    private void send(String partnerId, Location l) {
        if (partnerId == null) return;
        try {
            JSONObject args = new JSONObject()
                .put("p_partner_id", partnerId)
                .put("p_lat", Math.round(l.getLatitude() * 1e6) / 1e6)
                .put("p_lng", Math.round(l.getLongitude() * 1e6) / 1e6)
                .put("p_heading", l.hasBearing() ? l.getBearing() : JSONObject.NULL)
                .put("p_speed_mps", l.hasSpeed() ? l.getSpeed() : JSONObject.NULL)
                .put("p_accuracy_m", l.hasAccuracy() ? Math.round(l.getAccuracy()) : JSONObject.NULL);
            NavySession.Http.Result r = NavySession.rpc(this, "navy_report_position", args);
            if (r.code >= 200 && r.code < 300) {
                boolean ignored = false;
                try {
                    ignored = new JSONObject(r.body).optBoolean("ignored", false);
                } catch (Exception ignoredErr) {
                    // plain response
                }
                if (!ignored) NavyStatus.sent(this, true, null);
                return;
            }
            String code = NavySession.errorCode(r);
            NavyStatus.sent(this, false, r.code + " " + code);
            if ("42501".equals(code)) {
                // Not available any more (or not an approved driver): stop at once.
                NavyStatus.log(this, "server refused the position: stop");
                handler.post(() -> {
                    stopping = true;
                    stop(this, "refused");
                    NavyNativePlugin.emit("trackingStopped", "refused");
                });
            } else if (r.code == 401 && NavySession.getSession(this) == null) {
                handler.post(() -> {
                    stopping = true;
                    stop(this, "signed-out");
                    NavyNativePlugin.emit("trackingStopped", "signed-out");
                });
            }
        } catch (Exception e) {
            NavyStatus.sent(this, false, e.getClass().getSimpleName());
        }
    }

    /** Notification button "Pas disponible": the server is told first, then the sharing stops. */
    private void setUnavailable() {
        final String partnerId = NavySession.prefs(this).getString(NavyStatus.K_PARTNER, null);
        final String mode = NavySession.prefs(this).getString(NavyStatus.K_MODE, "available");
        io.execute(() -> {
            boolean ok = false;
            try {
                SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                iso.setTimeZone(TimeZone.getTimeZone("UTC"));
                JSONObject args = new JSONObject()
                    .put("p_partner_id", partnerId)
                    .put("p_available", false)
                    .put("p_dest_lat", JSONObject.NULL)
                    .put("p_dest_lng", JSONObject.NULL)
                    .put("p_client_at", iso.format(new Date()))
                    .put("p_origin_lat", JSONObject.NULL)
                    .put("p_origin_lng", JSONObject.NULL);
                NavySession.Http.Result r = NavySession.rpc(this, "navy_set_driver_status", args);
                ok = r.code >= 200 && r.code < 300;
                NavyStatus.log(this, "notification 'Pas disponible': server " + r.code);
            } catch (Exception e) {
                NavyStatus.log(this, "notification 'Pas disponible' failed: " + e.getClass().getSimpleName());
            }
            final boolean done = ok;
            handler.post(() -> {
                NavyNativePlugin.emit("availabilityOff", done ? "server" : "local");
                if ("course".equals(mode)) {
                    // A course in progress keeps sharing until the hand-over (server rule).
                    startInForeground("course");
                } else {
                    stopping = true;
                    stop(this, "notification");
                }
            });
        });
    }

    @Override
    public void onDestroy() {
        stopping = true;
        handler.removeCallbacks(tick);
        try {
            fused.removeLocationUpdates(callback);
        } catch (Exception ignored) {
            // already removed
        }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
        io.shutdown();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    static PendingIntent unavailableIntent(Context c) {
        Intent i = new Intent(c, LocationService.class).setAction(ACTION_UNAVAILABLE);
        return PendingIntent.getService(c, 3302, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
