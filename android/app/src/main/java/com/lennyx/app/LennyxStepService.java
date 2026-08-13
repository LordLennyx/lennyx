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
import android.os.PowerManager;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Service de premier plan : Lennyx vit en permanence dans le téléphone.
 *
 * ── Trois capteurs possibles, par ordre de préférence ────────────────────
 *  1. TYPE_STEP_COUNTER  — compteur MATÉRIEL cumulé depuis le dernier boot.
 *     Le meilleur : il accumule même quand le processus est mort, donc rien
 *     n'est perdu tant qu'on garde une valeur de référence.
 *  2. TYPE_STEP_DETECTOR — un évènement par pas, matériel lui aussi, mais
 *     sans cumul : ce qui tombe pendant que le processus est mort est perdu.
 *  3. TYPE_ACCELEROMETER — dernier recours, détection logicielle de pics.
 *     Coûteux (il faut tenir le CPU éveillé) mais présent sur TOUS les
 *     téléphones. Sans lui, un appareil sans podomètre matériel ne compte
 *     jamais rien hors de l'application — exactement le symptôme signalé.
 *
 * Les pas sont rangés dans SharedPreferences (clé "steps-YYYY-MM-DD"), lus
 * ensuite par la couche web au lancement, et poussés au widget en direct.
 */
public class LennyxStepService extends Service implements SensorEventListener {

    /** Même espace de préférences que LennyxStepStore : une seule source. */
    public static final String PREFS = LennyxStepStore.PREFS;
    public static final String CHANNEL_ID = "lennyx-presence";
    public static final String KEY_ENABLED = "backgroundEnabled";
    /** Capteur réellement utilisé, exposé au diagnostic : counter|detector|accel|none */
    public static final String KEY_SENSOR = "sensorMode";
    /** Dernier évènement reçu du capteur, même sans nouveau pas : preuve de vie. */
    public static final String KEY_HEARTBEAT = "lastSensorEvent";
    private static final int NOTIF_ID = 4242;

    private SensorManager sensorManager;
    private SharedPreferences prefs;
    private PowerManager.WakeLock wakeLock;
    private long lastNotifUpdate = 0;

    /** La notification permanente ne se rafraîchit qu'une fois par minute. */
    private static final long NOTIF_REFRESH_MS = 60_000;
    /** Un battement de cœur par minute suffit pour prouver que le service vit. */
    private static final long HEARTBEAT_MS = 60_000;
    private long lastHeartbeat = 0;

    // Détection logicielle (mode accéléromètre uniquement)
    private static final float PEAK_THRESHOLD = 1.4f; // m/s² au-dessus de la gravité lissée
    private static final long MIN_STEP_MS = 280; // cadence max ~3,5 pas/s
    private float avg = 9.81f;
    private boolean above = false;
    private long lastStepAt = 0;

    private String mode = "none";

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        createChannel();
        startForegroundCompat();
        pickSensor();
        LennyxWatchdogReceiver.schedule(this);
    }

    /**
     * Choisit le meilleur capteur disponible et s'y abonne. On demande d'abord
     * la variante « wakeup » du compteur : elle réveille le CPU pour livrer ses
     * relevés, donc le comptage continue écran éteint sans wake lock.
     */
    private void pickSensor() {
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) {
            mode = "none";
            prefs.edit().putString(KEY_SENSOR, mode).apply();
            return;
        }

        Sensor s = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER, true); // variante réveillante
        }
        if (s == null) s = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (s != null) {
            mode = "counter";
        } else {
            s = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
            if (s != null) {
                mode = "detector";
            } else {
                s = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
                mode = s != null ? "accel" : "none";
            }
        }

        prefs.edit().putString(KEY_SENSOR, mode).apply();
        LennyxStepStore.log(this, "service démarré, capteur=" + mode
            + (s == null ? "" : " (" + s.getName() + ")"));
        if (s == null) return;

        // Le compteur matériel accumule tout seul : inutile de réveiller le CPU
        // souvent. L'accéléromètre, lui, ne compte que ce qu'il voit passer.
        int delay = "accel".equals(mode) ? SensorManager.SENSOR_DELAY_GAME : SensorManager.SENSOR_DELAY_NORMAL;
        sensorManager.registerListener(this, s, delay);

        // Sans wake lock, l'accéléromètre se tait dès que le téléphone dort —
        // et le comptage hors application, qui est tout l'intérêt, s'arrête.
        if ("accel".equals(mode)) acquireWakeLock();
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lennyx:steps");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
        } catch (Exception ignored) {
            // sans wake lock le comptage sera partiel, mais mieux vaut ça qu'un crash
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        prefs.edit().putBoolean(KEY_ENABLED, true).apply();
        LennyxWatchdogReceiver.schedule(this);
        // START_STICKY : si Android tue le service sous pression mémoire, il le relance.
        return START_STICKY;
    }

    /**
     * L'utilisateur a balayé Lennyx hors des applications récentes. Le service
     * doit survivre — c'est justement là que la présence permanente sert. On
     * reprogramme le chien de garde au cas où le système nous tue dans la foulée.
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        LennyxWatchdogReceiver.schedule(this);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        // La trace la plus précieuse du journal : si le service meurt cinq
        // minutes après chaque extinction d'écran, c'est le système qui le tue.
        LennyxStepStore.log(this, "service arrêté par le système");
        if (sensorManager != null) sensorManager.unregisterListener(this);
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) { }
        }
        // Si la présence est toujours voulue, le chien de garde nous relancera.
        if (prefs.getBoolean(KEY_ENABLED, false)) LennyxWatchdogReceiver.schedule(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ── Capteur ───────────────────────────────────────────────────────────

    @Override
    public void onSensorChanged(SensorEvent event) {
        long now = System.currentTimeMillis();
        // Preuve de vie : le diagnostic doit pouvoir distinguer « service mort »
        // de « service vivant mais tu ne marches pas ».
        if (now - lastHeartbeat >= HEARTBEAT_MS) {
            lastHeartbeat = now;
            prefs.edit().putLong(KEY_HEARTBEAT, now).apply();
        }

        switch (event.sensor.getType()) {
            case Sensor.TYPE_STEP_COUNTER:
                onCumulativeCounter((long) event.values[0]);
                break;
            case Sensor.TYPE_STEP_DETECTOR:
                addSteps(Math.max(1, (int) event.values[0]));
                break;
            case Sensor.TYPE_ACCELEROMETER:
                onAccelerometer(event.values[0], event.values[1], event.values[2], now);
                break;
            default:
                break;
        }
    }

    /** Compteur matériel : un cumul depuis le dernier démarrage du téléphone. */
    private void onCumulativeCounter(long total) {
        // Logique partagée avec le plugin (LennyxStepStore) : deux copies du
        // recalage finiraient tôt ou tard par diverger.
        publish(LennyxStepStore.applyCumulative(this, total));
    }

    /** Détecteur matériel ou logiciel : on incrémente ce qu'on a déjà. */
    private void addSteps(int n) {
        publish(prefs.getInt("steps-" + today(), 0) + n);
    }

    private void onAccelerometer(float x, float y, float z, long now) {
        float m = (float) Math.sqrt(x * x + y * y + z * z);
        avg = avg * 0.96f + m * 0.04f;
        float delta = m - avg;
        if (delta > PEAK_THRESHOLD && !above) {
            above = true;
            if (now - lastStepAt > MIN_STEP_MS) {
                lastStepAt = now;
                addSteps(1);
            }
        } else if (delta < PEAK_THRESHOLD * 0.4f) {
            above = false;
        }
    }

    /** Écrit le total du jour, rafraîchit le widget et la notification. */
    private void publish(int stepsToday) {
        if (LennyxStepStore.publish(this, stepsToday) <= 0) return; // rien de neuf

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
