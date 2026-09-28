package com.cyberkely.navyay;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.util.Map;

/**
 * NAVY ay phase 3B: notifications through Firebase Cloud Messaging (free Spark plan).
 * send-push sends data messages only (high priority), so the app always decides how to
 * show them: a course offer rings like a call (NavyNotifications.showOffer), everything
 * else is a normal notification that opens the linked NAVY page.
 * A new token is kept on the phone and handed to the web page, which registers it for the
 * signed-in account (push_fcm_register); it is also registered from here when the
 * session is known, so a renewal while the app is closed is not lost.
 */
public class NavyMessagingService extends FirebaseMessagingService {
    static final String K_FCM_TOKEN = "fcm_token";

    @Override
    public void onNewToken(@NonNull String token) {
        NavySession.prefs(this).edit().putString(K_FCM_TOKEN, token).apply();
        NavyNativePlugin.emit("fcmToken", token);
        if (NavySession.getSession(this) != null) {
            new Thread(() -> {
                try {
                    NavySession.Http.Result r = NavySession.rpc(getApplicationContext(), "push_fcm_register",
                        new JSONObject().put("p_token", token).put("p_platform", "android").put("p_app_version", NavyNativePlugin.appVersion(getApplicationContext())));
                    NavyStatus.log(getApplicationContext(), "fcm token registered from the app: " + r.code);
                } catch (Exception e) {
                    NavyStatus.log(getApplicationContext(), "fcm token registration failed: " + e.getClass().getSimpleName());
                }
            }, "navy-fcm-register").start();
        }
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> d = message.getData();
        String kind = d.get("kind");
        NavyStatus.log(this, "fcm message " + kind);
        if ("offer".equals(kind)) {
            NavyNotifications.showOffer(this, NavyNotifications.Offer.from(d));
            return;
        }
        String title = d.get("title");
        String body = d.get("body");
        if ((title == null || title.isEmpty()) && message.getNotification() != null) {
            title = message.getNotification().getTitle();
            body = message.getNotification().getBody();
        }
        NavyNotifications.showGeneral(this, title, body, d.get("url"));
    }
}
