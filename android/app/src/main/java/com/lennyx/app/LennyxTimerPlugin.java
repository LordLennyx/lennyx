package com.lennyx.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Chronomètre et Pomodoro qui continuent hors de l'application.
 *
 * Deux pièces suffisent, et aucune ne demande de processus vivant :
 *  • une notification permanente en mode chronomètre — Android l'anime lui-même
 *    à partir d'un instant de référence, en avant pour le chrono, en décompte
 *    pour le Pomodoro ;
 *  • une alarme exacte à l'instant de fin de phase, qui sonne.
 *
 * L'application, à sa réouverture, recalcule tout depuis les horodatages : elle
 * n'a jamais besoin d'avoir « tourné » entre-temps.
 */
@CapacitorPlugin(name = "LennyxTimer")
public class LennyxTimerPlugin extends Plugin {

    public static final String CHANNEL_RUNNING = "lennyx-timer-running";

    private NotificationManager nm() {
        return (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
    }

    private void ensureChannel() {
        NotificationManager nm = nm();
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
            CHANNEL_RUNNING, "Minuteur en cours", NotificationManager.IMPORTANCE_LOW
        );
        ch.setDescription("Affiche le chronomètre ou le Pomodoro pendant qu'il tourne.");
        ch.setShowBadge(false);
        ch.setSound(null, null);
        nm.createNotificationChannel(ch);
    }

    /**
     * Affiche (ou met à jour) la notification-chronomètre.
     * @param baseMs   instant de référence : départ pour un compte en avant,
     *                 instant de fin pour un décompte.
     * @param countDown vrai pour un décompte (Pomodoro), faux pour le chrono.
     */
    @PluginMethod
    public void show(PluginCall call) {
        ensureChannel();
        NotificationManager nm = nm();
        if (nm == null) {
            call.resolve();
            return;
        }

        int id = call.getInt("id", 5001);
        String title = call.getString("title", "Lennyx");
        String text = call.getString("text", "");
        long baseMs = call.getLong("baseMs", System.currentTimeMillis());
        boolean countDown = Boolean.TRUE.equals(call.getBoolean("countDown", false));

        Intent launch = getContext().getPackageManager()
            .getLaunchIntentForPackage(getContext().getPackageName());
        PendingIntent pi = launch == null ? null : PendingIntent.getActivity(
            getContext(), 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder b = new Notification.Builder(getContext(), CHANNEL_RUNNING)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setShowWhen(true)
            .setWhen(baseMs)
            // Le système anime le compteur tout seul, à la seconde, sans
            // qu'aucun code de Lennyx ne tourne.
            .setUsesChronometer(true);
        if (countDown && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            b.setChronometerCountDown(true);
        }
        if (pi != null) b.setContentIntent(pi);

        try {
            nm.notify(id, b.build());
        } catch (Exception ignored) {
            // notifications refusées : le minuteur reste juste, seul l'affichage manque
        }

        // Fin de phase : une alarme exacte, posée seulement si on décompte.
        LennyxTimerReceiver.cancel(getContext(), id);
        if (countDown && baseMs > System.currentTimeMillis()) {
            LennyxTimerReceiver.scheduleAt(
                getContext(), id, baseMs,
                call.getString("endTitle", "Phase terminée"),
                call.getString("endText", "")
            );
        }

        JSObject ret = new JSObject();
        ret.put("shown", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        int id = call.getInt("id", 5001);
        NotificationManager nm = nm();
        if (nm != null) {
            nm.cancel(id);
            nm.cancel(id + 1); // l'annonce de fin, si elle a déjà été posée
        }
        LennyxTimerReceiver.cancel(getContext(), id);
        call.resolve();
    }
}
