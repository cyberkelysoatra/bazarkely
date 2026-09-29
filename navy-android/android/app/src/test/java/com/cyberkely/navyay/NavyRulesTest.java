package com.cyberkely.navyay;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Phase 3C: checks of an update file (run by the build, gradle testReleaseUnitTest). */
public class NavyRulesTest {
    private static final String SHA = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test
    public void onlyReleasesOfTheRepository() {
        assertTrue(NavyRules.isAllowedUpdateUrl("https://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v1.2.1/navy-ay.apk"));
        assertFalse(NavyRules.isAllowedUpdateUrl("https://github.com/cyberkelysoatra/bazarkely/releases/latest/download/navy-ay.apk"));
        assertFalse(NavyRules.isAllowedUpdateUrl("https://github.com/someone/bazarkely/releases/download/navy-android-v1.2.1/navy-ay.apk"));
        assertFalse(NavyRules.isAllowedUpdateUrl("http://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v1.2.1/navy-ay.apk"));
        assertFalse(NavyRules.isAllowedUpdateUrl("https://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v1.2.1/../../x.apk"));
        assertFalse(NavyRules.isAllowedUpdateUrl("https://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v1.2.1/navy-ay.apk?x=@evil.com"));
        assertFalse(NavyRules.isAllowedUpdateUrl("https://evil.com/navy-ay.apk"));
        assertFalse(NavyRules.isAllowedUpdateUrl(null));
    }

    @Test
    public void redirectsStayOnGithub() {
        assertTrue(NavyRules.isAllowedRedirect("https://objects.githubusercontent.com/github-production-release-asset/1?x=y"));
        assertTrue(NavyRules.isAllowedRedirect("https://release-assets.githubusercontent.com/github-production-release-asset/1"));
        assertFalse(NavyRules.isAllowedRedirect("http://objects.githubusercontent.com/x"));
        assertFalse(NavyRules.isAllowedRedirect("https://objects.githubusercontent.com.evil.com/x"));
        assertFalse(NavyRules.isAllowedRedirect("https://evil.com/?github.com"));
    }

    @Test
    public void checksOfTheFile() {
        assertNull(NavyRules.updateRefusal(SHA, SHA.toUpperCase(), "com.cyberkely.navyay", 10201, 10200, Boolean.TRUE));
        assertNull(NavyRules.updateRefusal(SHA, SHA, "com.cyberkely.navyay", 10201, 10200, null));
        assertEquals("sha256", NavyRules.updateRefusal(SHA, SHA.replace('0', '1'), "com.cyberkely.navyay", 10201, 10200, Boolean.TRUE));
        assertEquals("sha256", NavyRules.updateRefusal("not-a-hash", "not-a-hash", "com.cyberkely.navyay", 10201, 10200, Boolean.TRUE));
        assertEquals("package", NavyRules.updateRefusal(SHA, SHA, "com.other.app", 10201, 10200, Boolean.TRUE));
        assertEquals("version", NavyRules.updateRefusal(SHA, SHA, "com.cyberkely.navyay", 10200, 10200, Boolean.TRUE));
        assertEquals("version", NavyRules.updateRefusal(SHA, SHA, "com.cyberkely.navyay", 10100, 10200, Boolean.TRUE));
        assertEquals("signature", NavyRules.updateRefusal(SHA, SHA, "com.cyberkely.navyay", 10201, 10200, Boolean.FALSE));
    }

    @Test
    public void progress() {
        assertEquals(45, NavyRules.percent(45, 100));
        assertEquals(0, NavyRules.percent(10, 0));
        assertEquals(100, NavyRules.percent(120, 100));
    }
}
