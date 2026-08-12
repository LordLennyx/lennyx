package com.lennyx.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Service de premier plan : Lennyx vit en permanence dans le téléphone.
 *
 * Il écoute TYPE_STEP_COUNTER, le compteur de pas MATÉRIEL d'Android — celui-ci
 * continue de compter même écran éteint et application fermée, contrairement à
 * l'accéléromètre qui exigeait que l'app soit ouverte. Le compteur donne un
 * total cumulé depuis le dernier redémarrage du téléphone : on mémorise donc
 * une valeur de référence par jour et on stocke le différentiel.
 *
 * Les pas sont rangés dans SharedPreferences (clé "steps-YYYY-MM-DD"), lus
 * ensuite par la couche web au lancement, et poussés au widget en direct.
 */
public class LennyxStepService extends Service implements SensorEventListener {

    public static final String PREFS = "LennyxBackground";
    public static final String CHANNEL_ID = "lennyx-presence";
    public static final String KEY_ENABLED = "backgroundEnabled";
    private static final int NOTIF_ID = 4242;

    private SensorManager sensorManager;
    private Sensor stepCounter;
    private SharedPreferences prefs;
    private long lastNotifUpdate = 0;

    /** La notification permanente ne se rafraîchit qu'une fois par minute. */
    private static final long NOTIF_REFRESH_MS = 60_000;

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        createChannel();
        startForegroundCompat();

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            if (stepCounter != null) {
                // SENSOR_DELAY_NORMAL suffit : le capteur matériel accumule de
                // toute façon, inutile de réveiller le CPU plus souvent.
                sensorManager.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        prefs.edit().putBoolean(KEY_ENABLED, true).apply();
        // START_STICKY : si Android tue le service sous pression mémoire, il le relance.
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (sensorManager != null) sensorManager.unregisterListener(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ── Capteur ───────────────────────────────────────────────────────────

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;
        long total = (long) event.values[0];
        String day = today();

        String baselineDay = prefs.getString("baselineDay", "");
        long baseline = prefs.getLong("baseline", -1);

        // Nouveau jour, premier démarrage, ou redémarrage du téléphone
        // (le compteur matériel repart de zéro) : on recale la référence.
        if (!day.equals(baselineDay) || baseline < 0 || total < baseline) {
            baseline = total;
            prefs.edit()
                .putString("baselineDay", day)
                .putLong("baseline", baseline)
                .apply();
        }

        int stepsToday = (int) Math.max(0, total - baseline);
        int previous = prefs.getInt("steps-" + day, 0);
        if (stepsToday <= previous) return; // rien de neuf, on évite d'écrire

        prefs.edit()
            .putInt("steps-" + day, stepsToday)
            .putLong("lastUpdate", System.currentTimeMillis())
            .apply();

        // Le widget reflète les pas en direct, même application fermée.
        SharedPreferences widgetPrefs =
            getSharedPreferences(LennyxWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        widgetPrefs.edit().putInt("stepsToday", stepsToday).apply();
        LennyxWidgetProvider.updateAll(this);

        // La notification permanente affiche le compteur : figée à « 0 pas »,
        // elle donnerait l'impression que le service ne fait rien.
        long now = System.currentTimeMillis();
        if (now - lastNotifUpdate >= NOTIF_REFRESH_MS) {
            lastNotifUpdate = now;
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                try {
                    nm.notify(NOTIF_ID, buildNotification());
                } catch (Exception ignored) {
                    // l'affichage du compteur n'est jamais critique
                }
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    // ── Notification persistante (obligatoire pour un service de premier plan) ──

    private void createChannel() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Présence de Lennyx",
            NotificationManager.IMPORTANCE_MIN // discrète : ni son, ni vibration
        );
        channel.setDescription("Compte tes pas et veille sur tes quêtes en continu.");
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = launch == null ? null : PendingIntent.getActivity(
            this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        int steps = prefs.getInt("steps-" + today(), 0);
        Notification.Builder b = new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Lennyx veille")
            .setContentText(steps + " pas aujourd'hui")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setShowWhen(false);
        if (pi != null) b.setContentIntent(pi);
        return b.build();
    }

    /**
     * ⚠ Depuis Android 14, démarrer un service de premier plan de type « health »
     * sans la permission ACTIVITY_RECOGNITION lève une SecurityException qui fait
     * planter l'application. On se replie alors sur un service sans type déclaré
     * plutôt que de tomber : mieux vaut un comptage dégradé qu'un crash.
     */
    private void startForegroundCompat() {
        Notification n = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
            } else {
                startForeground(NOTIF_ID, n);
            }
        } catch (Exception e) {
            try {
                startForeground(NOTIF_ID, n);
            } catch (Exception ignored) {
                // dernier recours : le service s'arrête proprement au lieu de planter
                stopSelf();
            }
        }
    }
}
