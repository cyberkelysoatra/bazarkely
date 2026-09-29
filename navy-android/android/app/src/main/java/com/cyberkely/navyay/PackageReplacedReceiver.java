package com.cyberkely.navyay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * NAVY ay phase 3C: Android has just replaced the app by a new version (update done).
 * The downloaded file is deleted and a notification brings the driver back into NAVY ay
 * (Android forbids opening a screen by itself from here). The session is kept: it lives
 * in the app's data, which an update never touches. The page itself also says
 * "NAVY ay est à jour (X)" once at the next opening.
 */
public class PackageReplacedReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        if (intent == null || !Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) return;
        NavyUpdater.deleteFile(c);
        String v = NavyNativePlugin.appVersion(c);
        NavyStatus.log(c, "app updated to " + v);
        NavyNotifications.ensureChannels(c);
        NavyNotifications.showGeneral(c, "NAVY ay est à jour" + (v != null ? " (" + v + ")" : ""), "Touchez pour revenir dans NAVY ay.", "/navy");
    }
}
