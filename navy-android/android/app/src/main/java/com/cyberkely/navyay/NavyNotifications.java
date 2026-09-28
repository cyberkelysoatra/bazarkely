package com.cyberkely.navyay;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Map;

/**
 * NAVY ay phase 3B: the app's notifications.
 *  - "navy_position": the permanent notification while the position is shared (quiet).
 *  - "navy_offers_call": a course offer, like an incoming call: full-screen alert on a
 *    locked screen, ringtone repeated (FLAG_INSISTENT) with vibration, "Accepter" /
 *    "Refuser", removed at the offer's deadline (30 s at most) or as soon as the offer is
 *    no longer valid.
 *  - "navy_general": every other NAVY notification (normal).
 */
final class NavyNotifications {
    static final String CH_POSITION = "navy_position";
    static final String CH_OFFERS = "navy_offers_call";
    static final String CH_GENERAL = "navy_general";
    static final int OFFER_NOTIF_ID = 3400;
    static final String EXTRA_URL = "navyUrl";
    static final String EXTRA_CANCEL_NOTIF = "navyCancelNotif";

    private NavyNotifications() {}

    static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel(CH_POSITION) == null) {
            NotificationChannel ch = new NotificationChannel(CH_POSITION, "Position partagée", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Affichée tant que votre position est partagée (disponible ou course en cours).");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CH_OFFERS) == null) {
            NotificationChannel ch = new NotificationChannel(CH_OFFERS, "Nouvelles courses", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Sonne comme un appel quand une course vous est proposée.");
            Uri ring = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ch.setSound(ring, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[] {0, 800, 500, 800, 500, 800});
            ch.enableLights(true);
            ch.setLightColor(Color.YELLOW);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CH_GENERAL) == null) {
            NotificationChannel ch = new NotificationChannel(CH_GENERAL, "NAVY ay", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Colis, paiements, disponibilité.");
            nm.createNotificationChannel(ch);
        }
    }

    /** Opens the app on an in-app address (/navy/...). */
    static PendingIntent openApp(Context c, String path, int requestCode, int cancelNotifId) {
        Intent i = new Intent(c, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EXTRA_URL, NavyRules.isSafeAppPath(path) ? path : "/navy")
            .putExtra(EXTRA_CANCEL_NOTIF, cancelNotifId);
        return PendingIntent.getActivity(c, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static Notification trackingNotification(Context c, boolean course) {
        ensureChannels(c);
        return new NotificationCompat.Builder(c, CH_POSITION)
            .setSmallIcon(R.drawable.ic_stat_navy)
            .setColor(0xFFE9B824)
            .setContentTitle("NAVY ay : votre position est partagée")
            .setContentText(course ? "Course en cours" : "Disponible")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openApp(c, course ? "/navy/courses" : "/navy/direction", 3303, 0))
            .addAction(0, "Pas disponible", LocationService.unavailableIntent(c))
            .build();
    }

    static void showGeneral(Context c, String title, String body, String url) {
        ensureChannels(c);
        int id = (int) (System.currentTimeMillis() % 100000) + 5000;
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_GENERAL)
            .setSmallIcon(R.drawable.ic_stat_navy)
            .setColor(0xFFE9B824)
            .setContentTitle(title != null && !title.isEmpty() ? title : "NAVY ay")
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openApp(c, url, id, id));
        notify(c, id, b.build());
    }

    /** Offer data from send-push (FCM data message). */
    static final class Offer {
        String offerId;
        String parcelId;
        long expiresAt;
        String fare;
        String depot;
        String arrival;
        boolean broadcast;
        String title;

        static Offer from(Map<String, String> d) {
            Offer o = new Offer();
            o.offerId = d.get("offer_id");
            o.parcelId = d.get("parcel_id");
            try {
                o.expiresAt = Long.parseLong(d.get("expires_at_ms"));
            } catch (Exception e) {
                o.expiresAt = System.currentTimeMillis() + 30_000;
            }
            o.fare = d.get("fare");
            o.depot = d.get("depot_name");
            o.arrival = d.get("arrival_name");
            o.broadcast = "true".equals(d.get("broadcast"));
            o.title = d.get("title");
            return o;
        }

        String acceptPath() {
            return "/navy/offres?colis=" + parcelId + "&reponse=accepter";
        }

        Intent toIntent(Intent i) {
            return i.putExtra("offer_id", offerId).putExtra("parcel_id", parcelId).putExtra("expires_at_ms", expiresAt)
                .putExtra("fare", fare).putExtra("depot_name", depot).putExtra("arrival_name", arrival)
                .putExtra("broadcast", broadcast);
        }

        static Offer fromIntent(Intent i) {
            Offer o = new Offer();
            o.offerId = i.getStringExtra("offer_id");
            o.parcelId = i.getStringExtra("parcel_id");
            o.expiresAt = i.getLongExtra("expires_at_ms", 0);
            o.fare = i.getStringExtra("fare");
            o.depot = i.getStringExtra("depot_name");
            o.arrival = i.getStringExtra("arrival_name");
            o.broadcast = i.getBooleanExtra("broadcast", false);
            return o;
        }
    }

    /** The course offer, like an incoming call. */
    static void showOffer(Context c, Offer o) {
        ensureChannels(c);
        long ring = NavyRules.ringMs(o.expiresAt, System.currentTimeMillis());
        if (ring <= 0 || o.parcelId == null) return;

        Intent full = o.toIntent(new Intent(c, OfferAlertActivity.class))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullPi = PendingIntent.getActivity(c, 3401, full, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent refuse = o.toIntent(new Intent(c, OfferActionReceiver.class).setAction(OfferActionReceiver.ACTION_REFUSE));
        PendingIntent refusePi = PendingIntent.getBroadcast(c, 3402, refuse, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String text = (o.fare != null ? o.fare + " Ar" : "Nouvelle course")
            + (o.depot != null ? " · " + o.depot : "")
            + (o.arrival != null ? " → " + o.arrival : "");

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_OFFERS)
            .setSmallIcon(R.drawable.ic_stat_navy)
            .setColor(0xFFE9B824)
            .setContentTitle(o.broadcast ? "Nouvelle course : le premier qui accepte l’emporte" : "Nouvelle course NAVY ay")
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(true)
            .setTimeoutAfter(ring)
            .setFullScreenIntent(fullPi, true)
            .setContentIntent(fullPi)
            .addAction(0, "Refuser", refusePi)
            .addAction(0, "Accepter", openApp(c, o.acceptPath(), 3403, OFFER_NOTIF_ID));
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT;
        notify(c, OFFER_NOTIF_ID, n);
        OfferWatch.start(c, o, ring);
    }

    static void cancelOffer(Context c) {
        NotificationManagerCompat.from(c).cancel(OFFER_NOTIF_ID);
    }

    @SuppressWarnings("MissingPermission")
    private static void notify(Context c, int id, Notification n) {
        try {
            NotificationManagerCompat.from(c).notify(id, n);
        } catch (SecurityException e) {
            NavyStatus.log(c, "notification refused (permission)");
        }
    }
}
