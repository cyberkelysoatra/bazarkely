package com.cyberkely.navyay;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * NAVY ay phase 3B: while an offer rings, checks every 3 seconds that it is still valid
 * (navy_my_offers, the driver's live offers). Taken by another driver, cancelled or
 * expired: the ringing stops and the alert disappears at once. The notification's own
 * timeout (deadline, 30 s at most) stops it anyway if the network is missing.
 */
final class OfferWatch {
    private static volatile String watching;

    private OfferWatch() {}

    static void start(Context ctx, NavyNotifications.Offer o, long ringMs) {
        final Context c = ctx.getApplicationContext();
        final String key = o.parcelId + ":" + System.nanoTime();
        watching = key;
        final long end = System.currentTimeMillis() + ringMs;
        new Thread(() -> {
            while (key.equals(watching) && System.currentTimeMillis() < end) {
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException e) {
                    return;
                }
                if (!key.equals(watching)) return;
                Boolean live = isLive(c, o);
                if (Boolean.FALSE.equals(live)) {
                    NavyStatus.log(c, "offer no longer valid: alert removed");
                    stopAll(c);
                    return;
                }
            }
            if (key.equals(watching)) stopAll(c);
        }, "navy-offer-watch").start();
    }

    /** Stops the ringing (notification removed) and closes the alert screen. */
    static void stopAll(Context c) {
        stopRinging(c);
        OfferAlertActivity.closeAll();
    }

    /** Stops the ringing only (the alert screen stays until it finishes itself). */
    static void stopRinging(Context c) {
        watching = null;
        NavyNotifications.cancelOffer(c);
    }

    /** True / false, or null when the server could not be asked. */
    static Boolean isLive(Context c, NavyNotifications.Offer o) {
        try {
            NavySession.Http.Result r = NavySession.rpc(c, "navy_my_offers", new JSONObject());
            if (r.code < 200 || r.code >= 300) return null;
            JSONArray list = new JSONArray(r.body);
            for (int i = 0; i < list.length(); i++) {
                JSONObject x = list.getJSONObject(i);
                if ((o.offerId != null && o.offerId.equals(x.optString("id")))
                    || (o.parcelId != null && o.parcelId.equals(x.optString("parcel_id")))) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return null;
        }
    }
}
