package com.lennyx.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.Calendar;

/**
 * Déclenche les réveils et berceuses à l'heure exacte, puis les relance tant
 * que l'utilisateur ne les a pas arrêtés explicitement.
 *
 * On utilise setAlarmClock() plutôt qu'un simple setExact : c'est la seule
 * programmation qu'Android traite comme un vrai réveil — elle traverse le mode
 * Doze sans être repoussée, et le système l'affiche dans la barre d'état. Un
 * réveil qui sonne « quand le téléphone veut bien » n'est pas un réveil.
 */
public class LennyxAlarmReceiver extends BroadcastReceiver {

    public static final String PREFS = "LennyxAlarms";
    public static final String EXTRA_KIND = "kind"; // "wake" | "lullaby"

    /** Numéro de requête distinct par type, sinon les deux alarmes s'écrasent. */
    private static int requestFor(String kind) {
        return "lullaby".equals(kind) ? 8102 : 8101;
    }

    private static PendingIntent pending(Context ctx, String kind) {
        Intent i = new Intent(ctx, LennyxAlarmReceiver.class);
        i.putExtra(EXTRA_KIND, kind);
        return PendingIntent.getBroadcast(
            ctx, requestFor(kind), i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** Programme un déclenchement à un instant précis. */
    public static void scheduleAt(Context ctx, String kind, long atMs) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = pending(ctx, kind);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Intent show = new Intent(ctx, MainActivity.class);
                PendingIntent showPi = PendingIntent.getActivity(
                    ctx, requestFor(kind) + 500, show,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(atMs, showPi), pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, atMs, pi);
            }
        } catch (SecurityException e) {
            try {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi);
            } catch (Exception ignored) { }
        }
    }

    public static void cancel(Context ctx, String kind) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pending(ctx, kind));
    }

    /**
     * Calcule la prochaine occurrence de HH:MM en respectant les jours choisis
     * (0 = dimanche … 6 = samedi, liste vide = tous les jours).
     */
    public static long nextOccurrence(String hhmm, int[] days) {
        String[] parts = hhmm.split(":");
        int hour = Integer.parseInt(parts[0]);
        int minute = Integer.parseInt(parts[1]);

        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, hour);
        c.set(Calendar.MINUTE, minute);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= System.currentTimeMillis()) {
            c.add(Calendar.DAY_OF_YEAR, 1);
        }
        if (days != null && days.length > 0) {
            for (int i = 0; i < 8; i++) {
                int dow = c.get(Calendar.DAY_OF_WEEK) - 1; // Calendar : dimanche = 1
                boolean ok = false;
                for (int d : days) if (d == dow) { ok = true; break; }
                if (ok) break;
                c.add(Calendar.DAY_OF_YEAR, 1);
            }
        }
        return c.getTimeInMillis();
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String kind = intent.getStringExtra(EXTRA_KIND);
        if (kind == null) kind = "wake";

        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(kind + ".on", false)) return;

        Intent svc = new Intent(ctx, LennyxAlarmService.class);
        svc.putExtra(EXTRA_KIND, kind);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(svc);
            } else {
                ctx.startService(svc);
            }
        } catch (Exception ignored) { }
    }
}
