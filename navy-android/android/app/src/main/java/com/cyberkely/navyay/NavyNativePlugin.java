package com.cyberkely.navyay;

import android.Manifest;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.util.Locale;

/**
 * NAVY ay phase 3B: bridge between the site (frontend/src/modules/navy-ay/services/nativeApp.ts)
 * and the native side of the app. Session relay, position sharing (LocationService),
 * Firebase token, permissions of the guided set-up screen, measurement log.
 * Only an address of 1sakely.org can reach it (Capacitor allowNavigation).
 */
@CapacitorPlugin(
    name = "NavyNative",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "backgroundLocation", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class NavyNativePlugin extends Plugin {
    private static WeakReference<NavyNativePlugin> instance = new WeakReference<>(null);

    @Override
    public void load() {
        instance = new WeakReference<>(this);
        NavyNotifications.ensureChannels(getContext());
    }

    /** Event to the web page, if it is loaded ("fcmToken", "trackingStopped", "availabilityOff"). */
    static void emit(String event, String value) {
        NavyNativePlugin p = instance.get();
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("value", value);
        p.notifyListeners(event, data, true);
    }

    static String appVersion(Context c) {
        try {
            PackageInfo info = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            return info.versionName;
        } catch (Exception e) {
            return null;
        }
    }

    // ------------------------------------------------------------------ session relay

    @PluginMethod
    public void setSession(PluginCall call) {
        NavySession.setConfig(getContext(), call.getString("url"), call.getString("anonKey"));
        NavySession.setSession(getContext(), call.getString("session"));
        call.resolve();
    }

    @PluginMethod
    public void getSession(PluginCall call) {
        JSObject r = new JSObject();
        r.put("session", NavySession.getSession(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        NavySession.clear(getContext());
        LocationService.stop(getContext(), "signed-out");
        call.resolve();
    }

    // ------------------------------------------------------------------ position sharing

    @PluginMethod
    public void startTracking(PluginCall call) {
        String partnerId = call.getString("partnerId");
        String mode = call.getString("mode", "available");
        if (partnerId == null || NavySession.getSession(getContext()) == null) {
            call.reject("no partner or no session");
            return;
        }
        if (!hasForegroundLocation()) {
            call.reject("location permission", "permission");
            return;
        }
        LocationService.start(getContext(), partnerId, mode);
        call.resolve(status());
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        LocationService.stop(getContext(), call.getString("reason", "page"));
        call.resolve(status());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    /** The web page's JavaScript is alive (measurement of the screen-off behaviour). */
    @PluginMethod
    public void jsBeat(PluginCall call) {
        NavyStatus.appendTime(getContext(), NavyStatus.K_BEATS, System.currentTimeMillis());
        call.resolve();
    }

    private JSObject status() {
        JSObject r;
        try {
            r = JSObject.fromJSONObject(NavyStatus.snapshot(getContext()));
        } catch (Exception e) {
            r = new JSObject();
        }
        r.put("appVersion", appVersion(getContext()));
        return r;
    }

    // ------------------------------------------------------------------ Firebase

    @PluginMethod
    public void getFcmToken(PluginCall call) {
        JSObject r = new JSObject();
        if (FirebaseApp.getApps(getContext()).isEmpty()) {
            r.put("available", false);
            call.resolve(r);
            return;
        }
        r.put("available", true);
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null) {
                NavySession.prefs(getContext()).edit().putString(NavyMessagingService.K_FCM_TOKEN, task.getResult()).apply();
                r.put("token", task.getResult());
            } else {
                r.put("token", NavySession.prefs(getContext()).getString(NavyMessagingService.K_FCM_TOKEN, null));
            }
            call.resolve(r);
        });
    }

    /** Sign-out: this device's token is dropped (a new one is issued at the next sign-in). */
    @PluginMethod
    public void deleteFcmToken(PluginCall call) {
        NavySession.prefs(getContext()).edit().remove(NavyMessagingService.K_FCM_TOKEN).apply();
        if (FirebaseApp.getApps(getContext()).isEmpty()) {
            call.resolve();
            return;
        }
        FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task -> call.resolve());
    }

    // ------------------------------------------------------------------ phase 3C: update from the app

    /** Installed version (name + Android versionCode) and whether Android lets NAVY ay update itself. */
    @PluginMethod
    public void getAppInfo(PluginCall call) {
        JSObject r = new JSObject();
        r.put("versionName", appVersion(getContext()));
        r.put("versionCode", NavyUpdater.installedVersionCode(getContext()));
        r.put("canInstall", NavyUpdater.canInstall(getContext()));
        r.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    /**
     * Downloads the new version into the app's private folder and checks it (address,
     * SHA-256, package, versionCode, certificate). Progress: event "updateProgress"
     * ({ value: "received/total" }). Resolves with { ok, reason?, versionName?, versionCode? }.
     */
    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        final String url = call.getString("url");
        final String sha = call.getString("sha256");
        final Long sizeArg = call.getLong("size", 0L);
        final long size = sizeArg == null ? 0L : sizeArg;
        final Context c = getContext();
        new Thread(() -> {
            JSONObject res = NavyUpdater.download(c, url, sha, size, (received, total) -> emit("updateProgress", received + "/" + total));
            try {
                call.resolve(JSObject.fromJSONObject(res));
            } catch (Exception e) {
                call.reject("update");
            }
        }, "navy-update").start();
    }

    @PluginMethod
    public void cancelUpdate(PluginCall call) {
        NavyUpdater.cancel();
        call.resolve();
    }

    /** The Android page "Installer des applis inconnues" for NAVY ay (asked once). */
    @PluginMethod
    public void openInstallPermission(PluginCall call) {
        JSObject r = new JSObject();
        r.put("opened", Build.VERSION.SDK_INT >= 26 && tryStart(NavyUpdater.permissionIntent(getContext())));
        r.put("canInstall", NavyUpdater.canInstall(getContext()));
        call.resolve(r);
    }

    /** Opens Android's own update screen for the checked file. */
    @PluginMethod
    public void installUpdate(PluginCall call) {
        JSObject r = new JSObject();
        boolean can = NavyUpdater.canInstall(getContext());
        r.put("canInstall", can);
        r.put("opened", can && NavyUpdater.openInstaller(getActivity() != null ? getActivity() : getContext()));
        call.resolve(r);
    }

    /** Deletes a leftover update file (after the update, or when the driver gives up). */
    @PluginMethod
    public void clearUpdate(PluginCall call) {
        NavyUpdater.deleteFile(getContext());
        call.resolve();
    }

    /** Samples of the automatic report (no coordinates) + phone model, for "Envoyer mon rapport". */
    @PluginMethod
    public void getReport(PluginCall call) {
        JSObject r = new JSObject();
        r.put("samples", NavyStatus.reportSamples(getContext()));
        r.put("model", ((Build.MANUFACTURER == null ? "" : Build.MANUFACTURER) + " " + (Build.MODEL == null ? "" : Build.MODEL)).trim());
        r.put("android", Build.VERSION.RELEASE);
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("appVersion", appVersion(getContext()));
        call.resolve(r);
    }

    // ------------------------------------------------------------------ permissions (guided screen)

    private boolean hasForegroundLocation() {
        Context c = getContext();
        return ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private String locationLevel() {
        if (!hasForegroundLocation()) return "none";
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return "always";
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            ? "always" : "foreground";
    }

    private boolean fullScreenAllowed() {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = getContext().getSystemService(NotificationManager.class);
        return nm != null && nm.canUseFullScreenIntent();
    }

    private boolean batteryExempt() {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    private JSObject permissionsState() {
        JSObject r = new JSObject();
        r.put("notifications", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        r.put("location", locationLevel());
        r.put("fullScreen", fullScreenAllowed());
        r.put("batteryExempt", batteryExempt());
        r.put("manufacturer", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase(Locale.ROOT));
        r.put("brand", Build.BRAND == null ? "" : Build.BRAND.toLowerCase(Locale.ROOT));
        r.put("model", Build.MODEL);
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("appVersion", appVersion(getContext()));
        r.put("firebase", !FirebaseApp.getApps(getContext()).isEmpty());
        return r;
    }

    @PluginMethod
    public void getPermissions(PluginCall call) {
        call.resolve(permissionsState());
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "permissionDone");
            return;
        }
        if (!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) openNotificationSettings();
        call.resolve(permissionsState());
    }

    @PluginMethod
    public void requestLocation(PluginCall call) {
        if (!hasForegroundLocation()) {
            requestPermissionForAlias("location", call, "permissionDone");
            return;
        }
        call.resolve(permissionsState());
    }

    /** "Toujours": Android 11+ opens the app's location page, Android 10 asks in a dialog. */
    @PluginMethod
    public void requestBackgroundLocation(PluginCall call) {
        if (!hasForegroundLocation()) {
            requestPermissionForAlias("location", call, "permissionDone");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !"always".equals(locationLevel())) {
            requestPermissionForAlias("backgroundLocation", call, "permissionDone");
            return;
        }
        call.resolve(permissionsState());
    }

    @PermissionCallback
    private void permissionDone(PluginCall call) {
        call.resolve(permissionsState());
    }

    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            tryStart(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + getContext().getPackageName())));
        }
        call.resolve(permissionsState());
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (!batteryExempt()) {
            boolean ok = tryStart(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName())));
            if (!ok) tryStart(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        }
        call.resolve(permissionsState());
    }

    /** Manufacturer screens for "lancement automatique" (Tecno, Infinix, Itel, Xiaomi, Samsung). */
    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        String[][] candidates = {
            { "com.transsion.phonemaster", "com.cyin.himgr.autostart.AutoStartActivity" },
            { "com.transsion.phonemaster", "com.cyin.himgr.widget.activity.MainSettingGpActivity" },
            { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
            { "com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity" },
            { "com.samsung.android.sm", "com.samsung.android.sm.battery.ui.BatteryActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
            { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
        };
        String opened = null;
        for (String[] cand : candidates) {
            Intent i = new Intent().setComponent(new ComponentName(cand[0], cand[1]));
            if (tryStart(i)) {
                opened = cand[0];
                break;
            }
        }
        if (opened == null) {
            tryStart(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName())));
            opened = "app-details";
        }
        JSObject r = permissionsState();
        r.put("opened", opened);
        call.resolve(r);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        tryStart(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName())));
        call.resolve(permissionsState());
    }

    private void openNotificationSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            tryStart(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName()));
        } else {
            tryStart(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName())));
        }
    }

    private boolean tryStart(Intent i) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (getActivity() != null) getActivity().startActivity(i);
            else getContext().startActivity(i);
            return true;
        } catch (ActivityNotFoundException | SecurityException e) {
            return false;
        }
    }
}
