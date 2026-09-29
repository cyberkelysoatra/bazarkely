package com.cyberkely.navyay;

/**
 * NAVY ay phase 3B: pure rules of the native side (mirrored and unit-tested on the web
 * side in frontend/src/modules/navy-ay/utils/backgroundRules.ts).
 */
final class NavyRules {
    private NavyRules() {}

    /** 30 s cadence unless the battery is under 20 % and not charging (then 60 s). */
    static boolean shouldSendFast(int level, int scale, boolean charging) {
        if (charging || level < 0 || scale <= 0) return true;
        return level * 100 / scale >= 20;
    }

    /** How long an offer rings: until its deadline, 30 s at most, never negative. */
    static long ringMs(long expiresAtMs, long nowMs) {
        long left = expiresAtMs - nowMs;
        if (left <= 0) return 0;
        return Math.min(left, 30_000L);
    }

    /** A relative in-app address only ("/navy/..."): never another site. */
    static boolean isSafeAppPath(String path) {
        return path != null && path.startsWith("/") && !path.startsWith("//") && !path.contains("\\") && path.length() < 500;
    }

    // ------------------------------------------------------------------ phase 3C: update

    /** Only the files of this repository's app Releases can be downloaded as an update. */
    static final String UPDATE_URL_PREFIX = "https://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v";
    static final String PACKAGE = "com.cyberkely.navyay";
    /** An update file larger than this is refused (the app weighs about 5 MB). */
    static final long MAX_UPDATE_BYTES = 60L * 1000 * 1000;

    /** First address of an update: a navy-android-vX.Y.Z Release asset of the repository. */
    static boolean isAllowedUpdateUrl(String url) {
        if (url == null || !url.startsWith(UPDATE_URL_PREFIX)) return false;
        String rest = url.substring(UPDATE_URL_PREFIX.length());
        return rest.matches("[0-9]{1,3}\\.[0-9]{1,2}\\.[0-9]{1,2}/[A-Za-z0-9._-]{1,80}\\.apk");
    }

    /** GitHub answers a Release download with a redirect to its file storage (HTTPS only). */
    static boolean isAllowedRedirect(String url) {
        if (url == null || !url.startsWith("https://")) return false;
        String host = url.substring(8);
        int end = host.length();
        for (char ch : new char[] { '/', '?', '#', ':' }) {
            int i = host.indexOf(ch);
            if (i >= 0 && i < end) end = i;
        }
        host = host.substring(0, end).toLowerCase(java.util.Locale.ROOT);
        return host.equals("github.com")
            || host.equals("objects.githubusercontent.com")
            || host.equals("release-assets.githubusercontent.com")
            || host.equals("github-releases.githubusercontent.com");
    }

    /** "ab12..." (64 hexadecimal characters, any case), or null when malformed. */
    static String normalizeSha256(String s) {
        if (s == null) return null;
        String v = s.trim().toLowerCase(java.util.Locale.ROOT);
        return v.matches("[0-9a-f]{64}") ? v : null;
    }

    /**
     * Checks of a downloaded update before Android is asked to open it. Returns null when
     * it can be proposed, else the reason: "sha256", "package", "version", "signature".
     * signatureSame: TRUE same certificate, FALSE different, null unknown (Android refuses
     * a different certificate anyway).
     */
    static String updateRefusal(String expectedSha, String actualSha, String packageName, long fileVersionCode,
                                long installedVersionCode, Boolean signatureSame) {
        String want = normalizeSha256(expectedSha);
        if (want == null || !want.equals(normalizeSha256(actualSha))) return "sha256";
        if (!PACKAGE.equals(packageName)) return "package";
        if (fileVersionCode <= installedVersionCode) return "version";
        if (Boolean.FALSE.equals(signatureSame)) return "signature";
        return null;
    }

    /** Download progress in whole percent (0 when the size is unknown). */
    static int percent(long received, long total) {
        if (total <= 0 || received <= 0) return 0;
        return (int) Math.min(100, received * 100 / total);
    }
}
