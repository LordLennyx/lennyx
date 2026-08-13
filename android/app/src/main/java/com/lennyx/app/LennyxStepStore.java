package com.lennyx.app;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Le comptage de pas, en un seul endroit.
 *
 * Le service ET le plugin écrivent les mêmes compteurs ; avoir deux copies de
 * la logique de recalage, c'était se garantir de les voir diverger un jour.
 *
 * ── L'idée qui rend tout ça robuste ───────────────────────────────────────
 * TYPE_STEP_COUNTER accumule DANS LE MATÉRIEL, depuis le dernier démarrage du
 * téléphone. Il continue donc de compter même quand Android a tué notre
 * service, notre processus, ou les deux. Il suffit de mémoriser une valeur de
 * référence et de relire le compteur pour retrouver, intacts, les pas faits
 * pendant l'absence. Le service sert à rafraîchir le widget en direct ; la
 * justesse du compte, elle, n'en dépend pas.
 */
public final class LennyxStepStore {

    public static final String PREFS = "LennyxBackground";
    /** Journal de bord, pour que le diagnostic montre des faits, pas des suppositions. */
    private static final String KEY_LOG = "journal";
    private static final int LOG_MAX = 40;

    private LennyxStepStore() { }

    public static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /**
     * Applique un relevé du compteur matériel (cumul depuis le dernier boot) et
     * renvoie le total du jour.
     *
     * Un seul recalage, trois causes possibles : premier démarrage, nouveau
     * jour, ou redémarrage du téléphone (le compteur repart à zéro). Les clés
     * étant datées, un nouveau jour a naturellement un acquis nul.
     */
    public static int applyCumulative(Context ctx, long total) {
        SharedPreferences p = prefs(ctx);
        String day = today();
        String baselineDay = p.getString("baselineDay", "");
        long baseline = p.getLong("baseline", -1);
        // « Acquis » du jour : ce qui a déjà été compté avant que cette source
        // ne prenne la main (accéléromètre transmis au démarrage, ou relevés
        // du service d'avant un reboot). Sans lui, le compteur repartirait de
        // zéro et resterait figé le temps de rattraper l'existant.
        int offset = p.getInt("offset-" + day, 0);

        boolean firstEver = baseline < 0 || baselineDay.isEmpty();
        boolean newDay = !day.equals(baselineDay);
        boolean reboot = !firstEver && total < baseline;

        if (firstEver || newDay || reboot) {
            offset = Math.max(offset, p.getInt("steps-" + day, 0));
            // Après un redémarrage, le compteur matériel est reparti de zéro à
            // l'instant du boot : tout ce qu'il affiche a donc été marché
            // depuis, et doit être crédité. Au tout premier démarrage en
            // revanche, il porte l'historique d'avant Lennyx — on ne s'en
            // attribue rien, d'où la valeur de référence égale au total.
            baseline = reboot ? 0 : total;
            p.edit()
                .putString("baselineDay", day)
                .putLong("baseline", baseline)
                .putInt("offset-" + day, offset)
                .apply();
            log(ctx, (reboot ? "recalage après redémarrage" : "recalage")
                + " base=" + baseline + " acquis=" + offset + " capteur=" + total);
        }

        return offset + (int) Math.max(0, total - baseline);
    }

    /** Enregistre le total du jour et rafraîchit le widget. Renvoie ce qui a été ajouté. */
    public static int publish(Context ctx, int stepsToday) {
        SharedPreferences p = prefs(ctx);
        String day = today();
        int previous = p.getInt("steps-" + day, 0);
        if (stepsToday <= previous) return 0;

        p.edit()
            .putInt("steps-" + day, stepsToday)
            .putLong("lastUpdate", System.currentTimeMillis())
            .apply();

        try {
            SharedPreferences widget =
                ctx.getSharedPreferences(LennyxWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            widget.edit().putInt("stepsToday", stepsToday).apply();
            LennyxWidgetProvider.updateAll(ctx);
        } catch (Exception ignored) {
            // le widget n'est jamais critique
        }
        return stepsToday - previous;
    }

    /** Incrément direct : détecteur de pas matériel ou détection logicielle. */
    public static void addSteps(Context ctx, int n) {
        publish(ctx, prefs(ctx).getInt("steps-" + today(), 0) + n);
    }

    // ── Journal ───────────────────────────────────────────────────────────

    /**
     * Trace horodatée des évènements du comptage. Deux tentatives de correction
     * à l'aveugle ont suffi : le diagnostic doit pouvoir dire ce qui s'est
     * réellement passé pendant que l'application était fermée.
     */
    public static synchronized void log(Context ctx, String message) {
        try {
            SharedPreferences p = prefs(ctx);
            String stamp = new SimpleDateFormat("dd/MM HH:mm:ss", Locale.FRANCE).format(new Date());
            String line = stamp + " " + message;
            String raw = p.getString(KEY_LOG, "");
            List<String> lines = new ArrayList<>();
            if (!raw.isEmpty()) {
                for (String l : raw.split("\n")) lines.add(l);
            }
            lines.add(line);
            while (lines.size() > LOG_MAX) lines.remove(0);
            // String.join n'existe qu'à partir d'Android 8 (minSdk du projet : 23).
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < lines.size(); i++) {
                if (i > 0) sb.append('\n');
                sb.append(lines.get(i));
            }
            p.edit().putString(KEY_LOG, sb.toString()).apply();
        } catch (Exception ignored) {
            // un journal qui ferait planter l'app serait le comble
        }
    }

    public static String readLog(Context ctx) {
        return prefs(ctx).getString(KEY_LOG, "");
    }

    public static void clearLog(Context ctx) {
        prefs(ctx).edit().remove(KEY_LOG).apply();
    }
}
