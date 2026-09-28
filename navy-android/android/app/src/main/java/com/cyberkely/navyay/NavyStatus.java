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
