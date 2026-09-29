package com.cyberkely.navyay;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * NAVY ay phase 3B: state of the position sharing, kept in the app's private preferences
 * so that it survives the process being restarted by Android. Also the measurement log
 * read by the guided set-up test and by the phase report: time of every position the
 * server acknowledged, and "heartbeats" of the web page (to see whether the JavaScript
 * still runs with the screen off). Nothing here leaves the phone.
 */
final class NavyStatus {
    private static final String TAG = "NavyAy";
    private static final int MAX_TIMES = 400;

    static final String K_TRACKING = "tracking";
    static final String K_PARTNER = "partner_id";
    static final String K_MODE = "mode";
    static final String K_STARTED = "started_at";
    static final String K_STOPPED = "stopped_at";
    static final String K_STOP_REASON = "stop_reason";
    static final String K_SENT_OK = "sent_ok";
    static final String K_SENT_FAIL = "sent_fail";
    static final String K_LAST_SENT = "last_sent_at";
    static final String K_LAST_FIX = "last_fix_at";
    static final String K_LAST_ERROR = "last_error";
    static final String K_INTERVAL = "interval_ms";
    static final String K_SENDS = "sends";
    static final String K_BEATS = "js_beats";
    static final String K_LOG = "log";
    static final String K_LAST_LAT = "last_lat";
    static final String K_LAST_LNG = "last_lng";
    /** Phase 3C: automatic report (battery, screen, positions), never any coordinates. */
    static final String K_REPORT = "report_samples";
    static final long REPORT_EVERY_MS = 5 * 60_000L;
    static final long REPORT_KEEP_MS = 48 * 60 * 60_000L;

    private NavyStatus() {}

    static SharedPreferences p(Context c) {
        return NavySession.prefs(c);
    }

    static synchronized void appendTime(Context c, String key, long t) {
        String cur = p(c).getString(key, "");
        StringBuilder sb = new StringBuilder(cur);
        if (sb.length() > 0) sb.append(',');
        sb.append(t);
        String[] parts = sb.toString().split(",");
        if (parts.length > MAX_TIMES) {
            StringBuilder cut = new StringBuilder();
            for (int i = parts.length - MAX_TIMES; i < parts.length; i++) {
                if (cut.length() > 0) cut.append(',');
                cut.append(parts[i]);
            }
            sb = cut;
        }
        p(c).edit().putString(key, sb.toString()).apply();
    }

    static JSONArray times(Context c, String key) {
        JSONArray a = new JSONArray();
        String cur = p(c).getString(key, "");
        if (cur.isEmpty()) return a;
        for (String s : cur.split(",")) {
            try {
                a.put(Long.parseLong(s));
            } catch (NumberFormatException ignored) {
                // skip
            }
        }
        return a;
    }

    static synchronized void log(Context c, String line) {
        Log.i(TAG, line);
        String cur = p(c).getString(K_LOG, "");
        String next = System.currentTimeMillis() + " " + line.replace('\n', ' ') + "\n" + cur;
        if (next.length() > 6000) next = next.substring(0, 6000);
        p(c).edit().putString(K_LOG, next).apply();
    }

    static synchronized void sent(Context c, boolean ok, String error) {
        sent(c, ok, error, Double.NaN, Double.NaN);
    }

    static synchronized void sent(Context c, boolean ok, String error, double lat, double lng) {
        SharedPreferences.Editor e = p(c).edit();
        long now = System.currentTimeMillis();
        if (ok) {
            e.putInt(K_SENT_OK, p(c).getInt(K_SENT_OK, 0) + 1).putLong(K_LAST_SENT, now);
            if (!Double.isNaN(lat)) e.putString(K_LAST_LAT, String.valueOf(lat)).putString(K_LAST_LNG, String.valueOf(lng));
        } else {
            e.putInt(K_SENT_FAIL, p(c).getInt(K_SENT_FAIL, 0) + 1).putString(K_LAST_ERROR, error);
        }
        e.apply();
        if (ok) appendTime(c, K_SENDS, now);
    }

    /**
     * Phase 3C: one sample every 5 minutes while the position is shared: time, battery %,
     * charging, screen on, battery saver, NAVY ay exempt from battery optimisation,
     * cumulative positions accepted / failed, interval. Kept 48 h on the phone, never a
     * coordinate. Read by the page for "Envoyer mon rapport".
     */
    static synchronized void sampleIfDue(Context c, boolean force) {
        long now = System.currentTimeMillis();
        JSONArray cur = reportSamples(c);
        if (!force && cur.length() > 0) {
            long last = cur.optJSONObject(cur.length() - 1) != null ? cur.optJSONObject(cur.length() - 1).optLong("t", 0) : 0;
            if (now - last < REPORT_EVERY_MS - 5_000) return;
        }
        try {
            android.content.Intent b = c.registerReceiver(null, new android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED));
            int level = b != null ? b.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) : -1;
            int scale = b != null ? b.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, 100) : 100;
            int status = b != null ? b.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1) : -1;
            android.os.PowerManager pm = (android.os.PowerManager) c.getSystemService(Context.POWER_SERVICE);
            JSONObject o = new JSONObject();
            o.put("t", now);
            o.put("bat", level >= 0 && scale > 0 ? Math.round(level * 1000f / scale) / 10.0 : JSONObject.NULL);
            o.put("chg", status == android.os.BatteryManager.BATTERY_STATUS_CHARGING || status == android.os.BatteryManager.BATTERY_STATUS_FULL);
            o.put("scr", pm != null && pm.isInteractive());
            o.put("save", pm != null && pm.isPowerSaveMode());
            o.put("exempt", pm != null && pm.isIgnoringBatteryOptimizations(c.getPackageName()));
            o.put("ok", p(c).getInt(K_SENT_OK, 0));
            o.put("fail", p(c).getInt(K_SENT_FAIL, 0));
            o.put("iv", p(c).getLong(K_INTERVAL, 0));
            o.put("run", p(c).getBoolean(K_TRACKING, false));
            JSONArray next = new JSONArray();
            for (int i = 0; i < cur.length(); i++) {
                JSONObject s = cur.optJSONObject(i);
                if (s != null && now - s.optLong("t", 0) <= REPORT_KEEP_MS) next.put(s);
            }
            next.put(o);
            p(c).edit().putString(K_REPORT, next.toString()).apply();
        } catch (Exception ignored) {
            // next time
        }
    }

    static JSONArray reportSamples(Context c) {
        try {
            return new JSONArray(p(c).getString(K_REPORT, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static JSONObject snapshot(Context c) {
        SharedPreferences s = p(c);
        JSONObject o = new JSONObject();
        try {
            o.put("running", s.getBoolean(K_TRACKING, false));
            o.put("partnerId", s.getString(K_PARTNER, null));
            o.put("mode", s.getString(K_MODE, null));
            o.put("startedAt", s.getLong(K_STARTED, 0));
            o.put("stoppedAt", s.getLong(K_STOPPED, 0));
            o.put("stopReason", s.getString(K_STOP_REASON, null));
            o.put("sentOk", s.getInt(K_SENT_OK, 0));
            o.put("sentFail", s.getInt(K_SENT_FAIL, 0));
            o.put("lastSentAt", s.getLong(K_LAST_SENT, 0));
            o.put("lastFixAt", s.getLong(K_LAST_FIX, 0));
            o.put("lastError", s.getString(K_LAST_ERROR, null));
            o.put("lastLat", s.getString(K_LAST_LAT, null));
            o.put("lastLng", s.getString(K_LAST_LNG, null));
            o.put("intervalMs", s.getLong(K_INTERVAL, 0));
            o.put("sends", times(c, K_SENDS));
            o.put("jsBeats", times(c, K_BEATS));
            o.put("log", s.getString(K_LOG, ""));
        } catch (Exception ignored) {
            // partial snapshot
        }
        return o;
    }
}
