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
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import java.io.File;

/**
 * Le cœur sonore du réveil et de la berceuse.
 *
 * Il tient trois rôles que rien d'autre ne peut tenir une fois l'écran éteint :
 *  • jouer l'extrait audio choisi par l'utilisateur, en boucle sur la portion
 *    qu'il a délimitée, au volume ALARME (donc audible même en silencieux) ;
 *  • pousser une notification à « intention plein écran », le seul mécanisme
 *    qui autorise une application à s'imposer par-dessus l'écran de
 *    verrouillage ou ce que l'utilisateur est en train de faire ;
 *  • se relancer toutes les N minutes tant que l'arrêt n'a pas été demandé
 *    explicitement — ignorer une notification ne doit pas suffire à dormir.
 */
public class LennyxAlarmService extends Service {

    public static final String CHANNEL_ID = "lennyx-alarm-fullscreen";
    public static final String ACTION_STOP = "com.lennyx.app.ALARM_STOP";
    public static final String ACTION_SNOOZE = "com.lennyx.app.ALARM_SNOOZE";
    private static final int NOTIF_ID = 4343;

    /** Repli quand l'utilisateur n'a pas encore choisi de son à lui. */
    private static final long SEGMENT_CHECK_MS = 200;

    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable segmentLoop;
    private String kind = "wake";

    private SharedPreferences prefs() {
        return getSharedPreferences(LennyxAlarmReceiver.PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopEverything(true);
            return START_NOT_STICKY;
        }
        if (ACTION_SNOOZE.equals(action)) {
            snooze();
            return START_NOT_STICKY;
        }

        if (intent != null && intent.getStringExtra(LennyxAlarmReceiver.EXTRA_KIND) != null) {
            kind = intent.getStringExtra(LennyxAlarmReceiver.EXTRA_KIND);
        }

        createChannel();
        startForegroundCompat();
        wakeScreen();
        startAudio();
        startVibration();
        // La relance périodique est armée AVANT toute interaction : si le
        // téléphone est éteint de force ou l'application tuée, le réveil
        // reviendra quand même.
        scheduleRepeat();
        return START_STICKY;
    }

    // ── Son ───────────────────────────────────────────────────────────────

    private void startAudio() {
        SharedPreferences p = prefs();
        String path = p.getString(kind + ".audio", null);
        final int startMs = p.getInt(kind + ".startMs", 0);
        final int endMs = p.getInt(kind + ".endMs", 0);
        float volume = p.getFloat(kind + ".volume", 1f);

        try {
            player = new MediaPlayer();
            // USAGE_ALARM : le système sort ce flux du volume « média » et le
            // fait passer outre le mode silencieux. Un réveil muet par erreur
            // de routage audio serait le pire des bugs.
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());

            boolean custom = path != null && new File(path).exists();
            if (custom) {
                player.setDataSource(path);
            } else {
                Uri fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (fallback == null) fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                if (fallback == null) return;
                player.setDataSource(this, fallback);
            }

            player.setVolume(volume, volume);
            player.prepare();

            if (custom && endMs > startMs) {
                // Boucle sur l'extrait délimité par l'utilisateur : on ne peut
                // pas s'appuyer sur setLooping(), qui reboucle sur le fichier
                // entier. On surveille la position et on revient au début.
                player.seekTo(startMs);
                player.start();
                segmentLoop = new Runnable() {
                    @Override
                    public void run() {
                        try {
                            if (player != null && player.isPlaying() && player.getCurrentPosition() >= endMs) {
                                player.seekTo(startMs);
                            }
                        } catch (Exception ignored) { }
                        handler.postDelayed(this, SEGMENT_CHECK_MS);
                    }
                };
                handler.postDelayed(segmentLoop, SEGMENT_CHECK_MS);
            } else {
                player.setLooping(true);
                if (custom && startMs > 0) player.seekTo(startMs);
                player.start();
            }
        } catch (Exception e) {
            // Fichier illisible ou supprimé : plutôt que le silence, on tombe
            // sur la sonnerie d'alarme du système.
            playSystemFallback();
        }
    }

    private void playSystemFallback() {
        try {
            if (player != null) {
                player.release();
                player = null;
            }
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) return;
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception ignored) { }
    }

    private void startVibration() {
        // La berceuse ne vibre pas : on cherche à endormir, pas à secouer.
        if ("lullaby".equals(kind)) return;
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;
            long[] pattern = { 0, 700, 600, 700, 600 };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        } catch (Exception ignored) { }
    }

    /** Allume l'écran : le combo image + son n'a aucun sens sur un écran noir. */
    private void wakeScreen() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "lennyx:alarm"
            );
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(60_000); // relâché tout seul : l'activité prend le relais
        } catch (Exception ignored) { }
    }

    // ── Notification plein écran ──────────────────────────────────────────

    private void createChannel() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
            CHANNEL_ID, "Réveil et berceuse", NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("L'écran de réveil de Lennyx, image et son compris.");
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setBypassDnd(true); // un réveil doit sonner même en Ne pas déranger
        // Le son est joué par le service lui-même, pas par la notification :
        // sinon deux pistes se superposeraient.
        ch.setSound(null, null);
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);
    }

    private Notification buildNotification() {
        Intent full = new Intent(this, LennyxAlarmActivity.class);
        full.putExtra(LennyxAlarmReceiver.EXTRA_KIND, kind);
        full.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent fullPi = PendingIntent.getActivity(
            this, 900, full, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stop = new Intent(this, LennyxAlarmService.class).setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(
            this, 901, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        boolean wake = !"lullaby".equals(kind);
        Notification.Builder b = new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(wake ? "Debout, conquérant" : "L'heure du repos")
            .setContentText(prefs().getString(kind + ".label", wake ? "Ton réveil sonne." : "Ta berceuse commence."))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setAutoCancel(false)
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(fullPi)
            // L'intention plein écran : ce qui fait surgir l'écran de Lennyx
            // par-dessus le verrouillage ou l'application en cours.
            .setFullScreenIntent(fullPi, true)
            .addAction(new Notification.Action.Builder(null, "Arrêter", stopPi).build());
        return b.build();
    }

    private void startForegroundCompat() {
        Notification n = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, n);
            }
        } catch (Exception e) {
            try {
                startForeground(NOTIF_ID, n);
            } catch (Exception ignored) {
                stopSelf();
            }
        }
    }

    // ── Relances et arrêt ─────────────────────────────────────────────────

    /**
     * Tant que l'arrêt n'est pas demandé, on revient. C'est la demande
     * explicite de l'utilisateur : « des rappels toutes les 5 minutes jusqu'à
     * ce que je clique où il faut ».
     */
    private void scheduleRepeat() {
        // Un essai ne se relance jamais : il s'arrête quand l'utilisateur le dit.
        if (prefs().getBoolean(kind + ".preview", false)) return;
        int minutes = prefs().getInt(kind + ".repeatMin", 5);
        if (minutes <= 0) return;
        LennyxAlarmReceiver.scheduleAt(this, kind, System.currentTimeMillis() + minutes * 60_000L);
    }

    private void snooze() {
        int minutes = prefs().getInt(kind + ".repeatMin", 5);
        LennyxAlarmReceiver.scheduleAt(this, kind, System.currentTimeMillis() + Math.max(1, minutes) * 60_000L);
        stopEverything(false);
    }

    /**
     * @param rearmNextDay true quand l'utilisateur a vraiment arrêté le réveil :
     *                     on annule les relances et on repositionne l'alarme
     *                     pour sa prochaine occurrence normale.
     */
    private void stopEverything(boolean rearmNextDay) {
        if (segmentLoop != null) handler.removeCallbacks(segmentLoop);
        try {
            if (player != null) {
                if (player.isPlaying()) player.stop();
                player.release();
            }
        } catch (Exception ignored) { }
        player = null;

        try {
            if (vibrator != null) vibrator.cancel();
        } catch (Exception ignored) { }

        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) { }
        }

        SharedPreferences p = prefs();
        if (p.getBoolean(kind + ".preview", false)) {
            // Fin d'un essai : on rend au réglage son état d'avant, sans rien
            // programmer. Sinon, essayer un réveil éteint l'allumerait.
            p.edit()
                .putBoolean(kind + ".on", p.getBoolean(kind + ".previewWasOn", false))
                .remove(kind + ".preview")
                .remove(kind + ".previewWasOn")
                .apply();
        } else if (rearmNextDay) {
            LennyxAlarmReceiver.cancel(this, kind);
            String time = p.getString(kind + ".time", null);
            if (p.getBoolean(kind + ".on", false) && time != null) {
                LennyxAlarmReceiver.scheduleAt(this, kind,
                    LennyxAlarmReceiver.nextOccurrence(time, decodeDays(p.getString(kind + ".days", ""))));
            }
        }

        stopForeground(true);
        stopSelf();
    }

    static int[] decodeDays(String csv) {
        if (csv == null || csv.isEmpty()) return new int[0];
        String[] parts = csv.split(",");
        int[] out = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            try {
                out[i] = Integer.parseInt(parts[i].trim());
            } catch (NumberFormatException e) {
                out[i] = 0;
            }
        }
        return out;
    }

    /** Arrêt demandé depuis l'écran plein écran. */
    public static void stopFromUi(Context ctx, boolean snooze) {
        Intent i = new Intent(ctx, LennyxAlarmService.class)
            .setAction(snooze ? ACTION_SNOOZE : ACTION_STOP);
        try {
            ctx.startService(i);
        } catch (Exception ignored) { }
    }

    @Override
    public void onDestroy() {
        if (segmentLoop != null) handler.removeCallbacks(segmentLoop);
        try {
            if (player != null) {
                player.release();
                player = null;
            }
        } catch (Exception ignored) { }
        try {
            if (vibrator != null) vibrator.cancel();
        } catch (Exception ignored) { }
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) { }
        }
        super.onDestroy();
    }

    /** Le volume ALARME du téléphone est-il à zéro ? Utile au diagnostic web. */
    static boolean alarmVolumeSilent(Context ctx) {
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        return am != null && am.getStreamVolume(AudioManager.STREAM_ALARM) == 0;
    }
}
