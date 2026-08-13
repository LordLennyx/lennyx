package com.lennyx.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Annonce la fin d'une phase de minuteur (Pomodoro, chronomètre programmé)
 * même si l'application n'est plus à l'écran.
 *
 * Le minuteur lui-même ne consomme rien : c'est une alarme exacte posée à
 * l'instant de fin, doublée d'une notification-chronomètre qui décompte toute
 * seule côté système. Aucun processus n'a besoin de rester éveillé pour ça —
 * c'est ce qui rend le procédé fiable là où une boucle JavaScript meurt avec
 * la fenêtre.
 */
public class LennyxTimerReceiver extends BroadcastReceiver {

    public static final String CHANNEL_DONE = "lennyx-timer-done";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";
    public static final String EXTRA_ID = "notifId";
    private static final int REQUEST = 7412;

    private static PendingIntent pending(Context ctx, int id, String title, String text) {
        Intent i = new Intent(ctx, LennyxTimerReceiver.class);
        i.putExtra(EXTRA_ID, id);
        i.putExtra(EXTRA_TITLE, title);
        i.putExtra(EXTRA_TEXT, text);
        return PendingIntent.getBroadcast(
            ctx, REQUEST + id, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static void scheduleAt(Context ctx, int id, long atMs, String title, String text) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = pending(ctx, id, title, text);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, atMs, pi);
            }
        } catch (SecurityException e) {
            try {
                am.set(AlarmManager.RTC_WAKEUP, atMs, pi);
            } catch (Exception ignored) { }
        }
    }

    public static void cancel(Context ctx, int id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pending(ctx, id, "", ""));
    }

    static void ensureChannel(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
            CHANNEL_DONE, "Fin de minuteur", NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Sonne quand une phase de Pomodoro ou un minuteur se termine.");
        ch.setSound(
            Uri.parse("android.resource://" + ctx.getPackageName() + "/" + R.raw.notif_celebrate),
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        );
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        ensureChannel(ctx);

        int id = intent.getIntExtra(EXTRA_ID, 5001);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String text = intent.getStringExtra(EXTRA_TEXT);

        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent pi = launch == null ? null : PendingIntent.getActivity(
            ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder b = new Notification.Builder(ctx, CHANNEL_DONE)
            .setContentTitle(title == null ? "Phase terminée" : title)
            .setContentText(text == null ? "" : text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_ALARM);
        if (pi != null) b.setContentIntent(pi);

        // La notification en cours (le décompte) n'a plus lieu d'être.
        nm.cancel(id);
        nm.notify(id + 1, b.build());
    }
}
