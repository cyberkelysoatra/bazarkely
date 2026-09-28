package com.cyberkely.navyay;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.lang.ref.WeakReference;

/**
 * NAVY ay phase 3B (decision 56 (2)): the course offer shown like an incoming call, over
 * the lock screen, screen turned on. The ringtone and vibration come from the offer
 * notification (FLAG_INSISTENT); this screen shows the offer, a countdown and two big
 * buttons. "Accepter" opens the app on the offer, which accepts it through the same
 * path as the Offres screen; "Refuser" refuses it on the server.
 */
public class OfferAlertActivity extends Activity {
    private static WeakReference<OfferAlertActivity> current = new WeakReference<>(null);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private NavyNotifications.Offer offer;
    private TextView countdown;

    static void closeAll() {
        OfferAlertActivity a = current.get();
        if (a != null) a.runOnUiThread(a::finish);
    }

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            long left = offer.expiresAt - System.currentTimeMillis();
            if (left <= 0) {
                OfferWatch.stopAll(getApplicationContext());
                finish();
                return;
            }
            if (!offer.broadcast) countdown.setText((left + 999) / 1000 + " s");
            handler.postDelayed(this, 250);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = new WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        offer = NavyNotifications.Offer.fromIntent(getIntent());
        if (offer.parcelId == null || NavyRules.ringMs(offer.expiresAt, System.currentTimeMillis()) <= 0) {
            finish();
            return;
        }
        setContentView(buildView());
        handler.post(tick);
    }

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private TextView text(String s, float sp, boolean bold, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private View buildView() {
        int charcoal = 0xFF2B2B2B;
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFFE9B824);
        root.setPadding(dp(24), dp(48), dp(24), dp(32));

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text(offer.broadcast ? "Nouvelle course\nLe premier qui accepte l’emporte" : "Nouvelle course", 22, true, charcoal);
        top.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        countdown = text(offer.broadcast ? "" : "30 s", 40, true, charcoal);
        top.addView(countdown);
        root.addView(top);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xE6FFFFFF);
        bg.setCornerRadius(dp(24));
        card.setBackground(bg);
        card.setPadding(dp(20), dp(20), dp(20), dp(20));
        card.addView(text("Vous gagnez", 14, false, charcoal));
        card.addView(text(offer.fare != null ? offer.fare + " Ar" : "—", 44, true, charcoal));
        if (offer.depot != null) {
            card.addView(text("Prendre chez", 13, false, 0xBF2B2B2B));
            card.addView(text(offer.depot, 18, true, charcoal));
        }
        if (offer.arrival != null) {
            card.addView(text("Livrer chez", 13, false, 0xBF2B2B2B));
            card.addView(text(offer.arrival, 18, true, charcoal));
        }
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.topMargin = dp(24);
        root.addView(card, cardLp);

        View spacer = new View(this);
        root.addView(spacer, new LinearLayout.LayoutParams(1, 0, 1));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        Button refuse = button("Refuser", Color.WHITE, charcoal);
        Button accept = button("Accepter", charcoal, 0xFFE9B824);
        LinearLayout.LayoutParams l1 = new LinearLayout.LayoutParams(0, dp(64), 1);
        l1.rightMargin = dp(8);
        LinearLayout.LayoutParams l2 = new LinearLayout.LayoutParams(0, dp(64), 1);
        l2.leftMargin = dp(8);
        buttons.addView(refuse, l1);
        buttons.addView(accept, l2);
        root.addView(buttons);

        refuse.setOnClickListener(v -> {
            OfferWatch.stopRinging(getApplicationContext());
            final NavyNotifications.Offer o = offer;
            new Thread(() -> OfferActionReceiver.refuse(getApplicationContext(), o), "navy-offer-refuse").start();
            finish();
        });
        accept.setOnClickListener(v -> accept());
        return root;
    }

    private Button button(String label, int bg, int fg) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setTextColor(fg);
        GradientDrawable d = new GradientDrawable();
        d.setColor(bg);
        d.setCornerRadius(dp(16));
        b.setBackground(d);
        return b;
    }

    private void accept() {
        OfferWatch.stopRinging(getApplicationContext());
        final Intent open = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(NavyNotifications.EXTRA_URL, offer.acceptPath());
        KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && km != null && km.isKeyguardLocked()) {
            km.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                @Override
                public void onDismissSucceeded() {
                    startActivity(open);
                    finish();
                }

                @Override
                public void onDismissCancelled() {
                    // Stays on the alert; the offer deadline still applies.
                }
            });
        } else {
            startActivity(open);
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(tick);
        if (current.get() == this) current = new WeakReference<>(null);
        super.onDestroy();
    }
}
