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
}
