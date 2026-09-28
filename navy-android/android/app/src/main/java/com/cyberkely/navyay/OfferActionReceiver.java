package com.cyberkely.navyay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

/**
 * NAVY ay phase 3B: "Refuser" on the offer notification. The ringing stops at once, then
 * the offer is refused on the server (navy_refuse_offer, same path as the Offres screen).
 * If the server cannot be reached the app opens on the offer to refuse it there.
 */
public class OfferActionReceiver extends BroadcastReceiver {
    static final String ACTION_REFUSE = "com.cyberkely.navyay.OFFER_REFUSE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ACTION_REFUSE.equals(intent.getAction())) return;
        final Context c = context.getApplicationContext();
        final NavyNotifications.Offer o = NavyNotifications.Offer.fromIntent(intent);
        OfferWatch.stopAll(c);
        final PendingResult pending = goAsync();
        new Thread(() -> {
            try {
                refuse(c, o);
            } finally {
                pending.finish();
            }
        }, "navy-offer-refuse").start();
    }

    static void refuse(Context c, NavyNotifications.Offer o) {
        boolean ok = false;
        if (o.offerId != null) {
            try {
                NavySession.Http.Result r = NavySession.rpc(c, "navy_refuse_offer", new JSONObject().put("p_offer_id", o.offerId));
                ok = r.code >= 200 && r.code < 300;
                NavyStatus.log(c, "offer refused from the alert: " + r.code);
            } catch (Exception e) {
                NavyStatus.log(c, "offer refusal failed: " + e.getClass().getSimpleName());
            }
        }
        if (!ok && o.parcelId != null) {
            try {
                NavyNotifications.openApp(c, "/navy/offres?colis=" + o.parcelId + "&reponse=refuser", 3404, 0).send();
            } catch (Exception ignored) {
                // the notification timeout ends the offer anyway
            }
        }
    }
}
