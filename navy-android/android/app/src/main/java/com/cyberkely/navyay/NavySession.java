package com.cyberkely.navyay;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * NAVY ay phase 3B: the Supabase session shared by the web page and the native services.
 *
 * The web page hands every new session to the app (Supabase storage relay, see
 * frontend/src/lib/supabase.ts) and reads it back from here, so ONE refresh token is in
 * use at a time: when the screen has been off for more than an hour the location service
 * refreshes the session itself (5 minutes before the expiry, earlier than the web page
 * which waits for the last 90 seconds), and the web page picks the new pair up on its
 * next read. A refresh token is therefore never replayed (Supabase would revoke the
 * whole session on a reuse). Stored in the app's private preferences (backup disabled).
 */
final class NavySession {
    static final String PREFS = "navy_native";
    private static final String K_SESSION = "session";
    private static final String K_URL = "supabase_url";
    private static final String K_ANON = "anon_key";
    private static final long REFRESH_MARGIN_S = 300;

    static final String DEFAULT_URL = "https://ofzmwrzatcztoekrpvkj.supabase.co";

    private NavySession() {}

    static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized void setConfig(Context c, String url, String anonKey) {
        if (url == null || !url.startsWith("https://") || anonKey == null || anonKey.isEmpty()) return;
        prefs(c).edit().putString(K_URL, url).putString(K_ANON, anonKey).apply();
    }

    static String url(Context c) {
        return prefs(c).getString(K_URL, DEFAULT_URL);
    }

    static String anonKey(Context c) {
        return prefs(c).getString(K_ANON, null);
    }

    private static long expiresAt(String json) {
        try {
            return new JSONObject(json).optLong("expires_at", 0);
        } catch (Exception e) {
            return 0;
        }
    }

    private static String userIdOf(String json) {
        try {
            JSONObject user = new JSONObject(json).optJSONObject("user");
            return user != null ? user.optString("id", null) : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** Keeps the session given by the web page unless the stored one is newer for the same account. */
    static synchronized void setSession(Context c, String json) {
        if (json == null || json.isEmpty()) return;
        String current = prefs(c).getString(K_SESSION, null);
        if (current != null) {
            String a = userIdOf(current);
            String b = userIdOf(json);
            if (a != null && a.equals(b) && expiresAt(current) > expiresAt(json)) return;
        }
        prefs(c).edit().putString(K_SESSION, json).apply();
    }

    static synchronized String getSession(Context c) {
        return prefs(c).getString(K_SESSION, null);
    }

    static synchronized void clear(Context c) {
        prefs(c).edit().remove(K_SESSION).apply();
    }

    static String userId(Context c) {
        String s = getSession(c);
        return s != null ? userIdOf(s) : null;
    }

    /** A valid access token (refreshed when it expires within 5 minutes), or null. */
    static synchronized String accessToken(Context c) {
        String s = getSession(c);
        if (s == null) return null;
        long now = System.currentTimeMillis() / 1000;
        if (expiresAt(s) - now < REFRESH_MARGIN_S) {
            if (!refresh(c)) {
                s = getSession(c);
                // Refresh failed (network): the current token may still be valid a little while.
                return s != null && expiresAt(s) > now + 10 ? tokenOf(s) : null;
            }
            s = getSession(c);
        }
        return s != null ? tokenOf(s) : null;
    }

    private static String tokenOf(String json) {
        try {
            return new JSONObject(json).optString("access_token", null);
        } catch (Exception e) {
            return null;
        }
    }

    /** Refreshes the session with its refresh token. False on failure (session kept). */
    static synchronized boolean refresh(Context c) {
        String s = getSession(c);
        String anon = anonKey(c);
        if (s == null || anon == null) return false;
        try {
            JSONObject session = new JSONObject(s);
            String rt = session.optString("refresh_token", null);
            if (rt == null || rt.isEmpty()) return false;
            JSONObject body = new JSONObject().put("refresh_token", rt);
            Http.Result r = Http.post(url(c) + "/auth/v1/token?grant_type=refresh_token", anon, null, body.toString());
            if (r.code == 200) {
                JSONObject fresh = new JSONObject(r.body);
                session.put("access_token", fresh.getString("access_token"));
                session.put("refresh_token", fresh.getString("refresh_token"));
                long expiresIn = fresh.optLong("expires_in", 3600);
                session.put("expires_in", expiresIn);
                session.put("expires_at", fresh.optLong("expires_at", System.currentTimeMillis() / 1000 + expiresIn));
                if (fresh.has("user")) session.put("user", fresh.get("user"));
                prefs(c).edit().putString(K_SESSION, session.toString()).apply();
                NavyStatus.log(c, "session refreshed");
                return true;
            }
            if (r.code == 400 || r.code == 401) {
                // Refresh token revoked (signed out elsewhere, reuse detected): forget it.
                NavyStatus.log(c, "session refresh refused " + r.code);
                clear(c);
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    /** Minimal HTTPS client (no dependency). */
    static final class Http {
        static final class Result {
            final int code;
            final String body;

            Result(int code, String body) {
                this.code = code;
                this.body = body;
            }
        }

        static Result post(String url, String apiKey, String bearer, String json) throws IOException {
            HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
            try {
                con.setConnectTimeout(10000);
                con.setReadTimeout(10000);
                con.setRequestMethod("POST");
                con.setDoOutput(true);
                con.setRequestProperty("Content-Type", "application/json");
                con.setRequestProperty("apikey", apiKey);
                con.setRequestProperty("Authorization", "Bearer " + (bearer != null ? bearer : apiKey));
                byte[] out = json.getBytes(StandardCharsets.UTF_8);
                con.setFixedLengthStreamingMode(out.length);
                try (OutputStream os = con.getOutputStream()) {
                    os.write(out);
                }
                int code = con.getResponseCode();
                InputStream in = code >= 400 ? con.getErrorStream() : con.getInputStream();
                StringBuilder sb = new StringBuilder();
                if (in != null) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = br.readLine()) != null) sb.append(line);
                    }
                }
                return new Result(code, sb.toString());
            } finally {
                con.disconnect();
            }
        }
    }

    /** Calls a database function as the signed-in account (one retry after a refresh on 401). */
    static Http.Result rpc(Context c, String fn, JSONObject args) throws IOException {
        String anon = anonKey(c);
        String token = accessToken(c);
        if (anon == null || token == null) return new Http.Result(401, "{\"code\":\"no_session\"}");
        Http.Result r = Http.post(url(c) + "/rest/v1/rpc/" + fn, anon, token, args.toString());
        if (r.code == 401) {
            synchronized (NavySession.class) {
                if (refresh(c)) {
                    token = accessToken(c);
                    if (token != null) r = Http.post(url(c) + "/rest/v1/rpc/" + fn, anon, token, args.toString());
                }
            }
        }
        return r;
    }

    /** Postgres error code of a failed call ("42501"...), or "". */
    static String errorCode(Http.Result r) {
        try {
            return new JSONObject(r.body).optString("code", "");
        } catch (Exception e) {
            return "";
        }
    }
}
