package com.cyberkely.navyay;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * NAVY ay Android app. Phase 3B: registers the NavyNative bridge and opens the NAVY page
 * linked to a notification ("navyUrl" extra, a relative address of 1sakely.org only).
 */
public class MainActivity extends BridgeActivity {
    static final String SITE = "https://1sakely.org";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavyNativePlugin.class);
        super.onCreate(savedInstanceState);
        NavyNotifications.ensureChannels(this);
        openLinkedPage(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openLinkedPage(intent);
    }

    private void openLinkedPage(Intent intent) {
        if (intent == null) return;
        String path = intent.getStringExtra(NavyNotifications.EXTRA_URL);
        int cancel = intent.getIntExtra(NavyNotifications.EXTRA_CANCEL_NOTIF, 0);
        intent.removeExtra(NavyNotifications.EXTRA_URL);
        intent.removeExtra(NavyNotifications.EXTRA_CANCEL_NOTIF);
        if (cancel != 0) NotificationManagerCompat.from(this).cancel(cancel);
        if (cancel == NavyNotifications.OFFER_NOTIF_ID) OfferWatch.stopRinging(this);
        if (!NavyRules.isSafeAppPath(path) || bridge == null) return;
        if (!bridge.isMinimumWebViewInstalled()) return; // the "update WebView" page stays
        final WebView wv = bridge.getWebView();
        wv.post(() -> wv.loadUrl(SITE + path));
    }
}
