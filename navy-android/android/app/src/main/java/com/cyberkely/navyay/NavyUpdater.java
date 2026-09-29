package com.cyberkely.navyay;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * NAVY ay phase 3C (decision 59 (1)): the app updates itself, never through the Downloads
 * folder nor the web download page.
 *   1. download of the new version into the app's PRIVATE folder (files/updates), with
 *      progress and cancel; the address must be a navy-android-vX.Y.Z Release asset of the
 *      repository (GitHub redirects to its file storage are followed, HTTPS only);
 *   2. checks before anything is shown to Android: SHA-256 equal to the one published in
 *      version.json, package com.cyberkely.navyay, versionCode higher than the installed
 *      one, same signing certificate when Android can tell (else Android itself refuses a
 *      different certificate). Any failed check deletes the file;
 *   3. Android's own update screen ("Voulez-vous mettre à jour cette application ?") opened
 *      directly through the FileProvider. The first time, Android asks to allow NAVY ay to
 *      install unknown apps (settings page opened by openInstallPermission).
 * After the update, PackageReplacedReceiver deletes the file and says "NAVY ay est à jour".
 */
final class NavyUpdater {
    static final String DIR = "updates";
    static final String FILE = "navy-ay-update.apk";

    private static final AtomicBoolean running = new AtomicBoolean(false);
    private static volatile boolean cancelled = false;
    /** The file in files/updates passed every check during this run of the app. */
    private static volatile boolean ready = false;

    interface Progress {
        void onProgress(long received, long total);
    }

    private NavyUpdater() {}

    static File file(Context c) {
        File dir = new File(c.getFilesDir(), DIR);
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, FILE);
    }

    static void deleteFile(Context c) {
        ready = false;
        File f = file(c);
        if (f.exists()) f.delete();
    }

    static boolean isReady() {
        return ready || running.get();
    }

    static void cancel() {
        cancelled = true;
    }

    static long installedVersionCode(Context c) {
        try {
            PackageInfo info = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception e) {
            return Long.MAX_VALUE; // unknown: never propose anything
        }
    }

    static boolean canInstall(Context c) {
        return Build.VERSION.SDK_INT < 26 || c.getPackageManager().canRequestPackageInstalls();
    }

    /** Settings page "Installer des applis inconnues" for NAVY ay (Android 8+). */
    static Intent permissionIntent(Context c) {
        return new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + c.getPackageName()));
    }

    /**
     * Downloads and checks. Blocking: call from a background thread. Result:
     * { ok: true, versionName, versionCode, signature: "same" | "unknown" } or
     * { ok: false, reason: "busy" | "url" | "network" | "http" | "size" | "cancelled" | "corrupt"
     *   | "sha256" | "package" | "version" | "signature" }.
     */
    static JSONObject download(Context c, String url, String sha256, long expectedSize, Progress progress) {
        JSONObject r = new JSONObject();
        if (!running.compareAndSet(false, true)) return fail(r, "busy");
        cancelled = false;
        ready = false;
        File out = file(c);
        try {
            if (!NavyRules.isAllowedUpdateUrl(url) || NavyRules.normalizeSha256(sha256) == null) return fail(r, "url");
            out.delete();
            String reason = fetch(url, out, expectedSize, progress);
            if (reason != null) {
                out.delete();
                return fail(r, reason);
            }
            String actual = sha256Of(out);
            PackageManager pm = c.getPackageManager();
            PackageInfo archive = archiveInfo(pm, out);
            if (archive == null) {
                out.delete();
                NavyStatus.log(c, "update refused: corrupt");
                return fail(r, "corrupt");
            }
            long fileCode = Build.VERSION.SDK_INT >= 28 ? archive.getLongVersionCode() : archive.versionCode;
            Boolean same = sameSigner(c, archive);
            String refusal = NavyRules.updateRefusal(sha256, actual, archive.packageName, fileCode, installedVersionCode(c), same);
            if (refusal != null) {
                out.delete();
                NavyStatus.log(c, "update refused: " + refusal);
                return fail(r, refusal);
            }
            ready = true;
            r.put("ok", true);
            r.put("versionName", archive.versionName);
            r.put("versionCode", fileCode);
            r.put("signature", same == null ? "unknown" : "same");
            NavyStatus.log(c, "update ready: " + archive.versionName + " (" + fileCode + ")");
            return r;
        } catch (Exception e) {
            out.delete();
            return fail(r, "network");
        } finally {
            running.set(false);
        }
    }

    private static JSONObject fail(JSONObject r, String reason) {
        try {
            r.put("ok", false);
            r.put("reason", reason);
        } catch (Exception ignored) {
            // plain answer
        }
        return r;
    }

    /** Follows up to 5 redirects by hand, each one checked. Null when the file is complete. */
    private static String fetch(String url, File out, long expectedSize, Progress progress) throws Exception {
        String current = url;
        for (int hop = 0; hop < 6; hop++) {
            HttpURLConnection con = (HttpURLConnection) new URL(current).openConnection();
            con.setInstanceFollowRedirects(false);
            con.setConnectTimeout(15_000);
            con.setReadTimeout(30_000);
            con.setRequestProperty("User-Agent", "NavyAyApp-updater");
            try {
                int code = con.getResponseCode();
                if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                    String next = con.getHeaderField("Location");
                    if (next == null) return "http";
                    next = new URL(new URL(current), next).toString();
                    if (!NavyRules.isAllowedRedirect(next)) return "url";
                    current = next;
                    continue;
                }
                if (code != 200) return "http";
                long total = con.getContentLengthLong();
                if (total > NavyRules.MAX_UPDATE_BYTES) return "size";
                if (total <= 0 && expectedSize > 0) total = expectedSize;
                long received = 0;
                int lastPct = -1;
                byte[] buf = new byte[64 * 1024];
                try (InputStream in = con.getInputStream(); OutputStream os = new FileOutputStream(out)) {
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (cancelled) return "cancelled";
                        received += n;
                        if (received > NavyRules.MAX_UPDATE_BYTES) return "size";
                        os.write(buf, 0, n);
                        int pct = NavyRules.percent(received, total);
                        if (pct != lastPct && progress != null) {
                            lastPct = pct;
                            progress.onProgress(received, total);
                        }
                    }
                }
                if (cancelled) return "cancelled";
                if (expectedSize > 0 && received != expectedSize) return "size";
                if (progress != null) progress.onProgress(received, received);
                return null;
            } finally {
                con.disconnect();
            }
        }
        return "http";
    }

    static String sha256Of(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] buf = new byte[64 * 1024];
        try (InputStream in = new java.io.FileInputStream(f)) {
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
        }
        StringBuilder sb = new StringBuilder();
        for (byte b : md.digest()) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    @SuppressWarnings("deprecation")
    private static PackageInfo archiveInfo(PackageManager pm, File f) {
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        return pm.getPackageArchiveInfo(f.getAbsolutePath(), flags);
    }

    /** TRUE same certificate, FALSE different, null when Android does not tell. */
    @SuppressWarnings("deprecation")
    private static Boolean sameSigner(Context c, PackageInfo archive) {
        try {
            PackageManager pm = c.getPackageManager();
            Signature[] mine;
            Signature[] theirs;
            if (Build.VERSION.SDK_INT >= 28) {
                PackageInfo me = pm.getPackageInfo(c.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                if (me.signingInfo == null || archive.signingInfo == null) return null;
                mine = me.signingInfo.getApkContentsSigners();
                theirs = archive.signingInfo.getApkContentsSigners();
            } else {
                mine = pm.getPackageInfo(c.getPackageName(), PackageManager.GET_SIGNATURES).signatures;
                theirs = archive.signatures;
            }
            if (mine == null || theirs == null || mine.length == 0 || theirs.length == 0) return null;
            Set<String> a = new HashSet<>();
            for (Signature s : mine) a.add(s.toCharsString());
            Set<String> b = new HashSet<>();
            for (Signature s : theirs) b.add(s.toCharsString());
            return a.equals(b);
        } catch (Exception e) {
            return null;
        }
    }

    /** Opens Android's update screen for the checked file. False when there is none. */
    static boolean openInstaller(Context c) {
        File f = file(c);
        if (!ready || running.get() || !f.exists()) return false;
        Uri uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
        Intent i = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
            return true;
        } catch (ActivityNotFoundException | SecurityException e) {
            return false;
        }
    }
}
