package com.lennyx.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * L'écran de réveil : l'image choisie par l'utilisateur, en plein écran, avec
 * l'heure et deux boutons, encadrés discrètement aux couleurs de Lennyx.
 *
 * Toute la difficulté est de s'imposer quel que soit l'état du téléphone. Trois
 * mécanismes s'additionnent, et aucun n'est redondant :
 *  • setShowWhenLocked  — autorise l'affichage par-dessus l'écran de verrouillage ;
 *  • setTurnScreenOn    — rallume un écran éteint ;
 *  • requestDismissKeyguard — écarte le verrou quand il n'a pas de code.
 * Le lancement lui-même vient de l'intention plein écran de la notification
 * posée par LennyxAlarmService : depuis Android 10, une application en
 * arrière-plan ne peut pas démarrer une activité autrement.
 */
public class LennyxAlarmActivity extends Activity {

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable clockTick;
    private String kind = "wake";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        try {
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                km.requestDismissKeyguard(this, null);
            }
        } catch (Exception ignored) { }

        setContentView(R.layout.activity_alarm);
        applyIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        applyIntent(intent);
    }

    private void applyIntent(Intent intent) {
        if (intent != null && intent.getStringExtra(LennyxAlarmReceiver.EXTRA_KIND) != null) {
            kind = intent.getStringExtra(LennyxAlarmReceiver.EXTRA_KIND);
        }
        final boolean wake = !"lullaby".equals(kind);
        SharedPreferences prefs = getSharedPreferences(LennyxAlarmReceiver.PREFS, Context.MODE_PRIVATE);

        TextView title = findViewById(R.id.alarm_title);
        TextView subtitle = findViewById(R.id.alarm_subtitle);
        TextView clock = findViewById(R.id.alarm_clock);
        ImageView bg = findViewById(R.id.alarm_background);
        View scrim = findViewById(R.id.alarm_scrim);
        Button snooze = findViewById(R.id.alarm_snooze);
        Button stop = findViewById(R.id.alarm_stop);

        title.setText(wake ? "DEBOUT, CONQUÉRANT" : "L'HEURE DU REPOS");
        String label = prefs.getString(kind + ".label", "");
        if (label.isEmpty()) {
            subtitle.setVisibility(View.GONE);
        } else {
            subtitle.setText(label);
        }

        // Fond choisi par l'utilisateur. On sous-échantillonne : une photo de
        // téléphone fait facilement 12 Mpx, largement de quoi épuiser la mémoire
        // d'un processus réveillé en pleine nuit.
        String imagePath = prefs.getString(kind + ".image", null);
        Bitmap bitmap = imagePath == null ? null : decodeScaled(imagePath, 1440);
        if (bitmap != null) {
            bg.setImageBitmap(bitmap);
            scrim.setVisibility(View.VISIBLE);
        } else {
            bg.setImageDrawable(null);
            scrim.setVisibility(View.GONE);
        }

        snooze.setVisibility(wake ? View.VISIBLE : View.GONE);
        snooze.setText("+" + Math.max(1, prefs.getInt(kind + ".repeatMin", 5)) + " min");
        snooze.setOnClickListener(v -> {
            LennyxAlarmService.stopFromUi(this, true);
            finishAndRemoveTask();
        });
        stop.setText(wake ? "JE SUIS DEBOUT" : "ÉTEINDRE");
        stop.setOnClickListener(v -> {
            LennyxAlarmService.stopFromUi(this, false);
            markStopped();
            finishAndRemoveTask();
        });

        clockTick = new Runnable() {
            @Override
            public void run() {
                clock.setText(new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date()));
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(clockTick);
    }

    /**
     * Trace l'heure d'arrêt pour que l'application la retrouve au prochain
     * lancement : c'est ce qui alimente le journal de réveil et les prédictions
     * de l'Oracle.
     */
    private void markStopped() {
        try {
            getSharedPreferences(LennyxAlarmReceiver.PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString("stopped." + kind + ".date",
                    new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()))
                .putString("stopped." + kind + ".time",
                    new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date()))
                .apply();
        } catch (Exception ignored) { }
    }

    /** Décodage économe : on ne charge jamais l'image en pleine résolution. */
    private static Bitmap decodeScaled(String path, int maxWidth) {
        try {
            if (!new File(path).exists()) return null;
            BitmapFactory.Options probe = new BitmapFactory.Options();
            probe.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(path, probe);
            int sample = 1;
            while (probe.outWidth / sample > maxWidth) sample *= 2;
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = sample;
            return BitmapFactory.decodeFile(path, opts);
        } catch (Throwable t) {
            return null; // OutOfMemory compris : mieux vaut un fond noir qu'un plantage
        }
    }

    /**
     * Le bouton retour ne doit pas congédier un réveil : sinon il suffirait
     * d'un réflexe pour le faire taire sans jamais se lever.
     */
    @Override
    public void onBackPressed() {
        // volontairement vide
    }

    @Override
    protected void onDestroy() {
        if (clockTick != null) handler.removeCallbacks(clockTick);
        super.onDestroy();
    }
}
