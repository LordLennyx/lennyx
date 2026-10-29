package com.lennyx.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * L'icône de Lennyx change de visage selon l'humeur de l'application.
 *
 * Android n'autorise pas à redessiner une icône de lanceur à la volée : la
 * seule voie officielle est de déclarer plusieurs `activity-alias`, chacun avec
 * son icône, et de n'en garder qu'UN actif. C'est la technique employée par
 * Duolingo et par l'application Agenda.
 *
 * ⚠️ TROIS pièges, tous rencontrés pour de vrai :
 *
 * 1. On ACTIVE le nouvel alias AVANT de désactiver les autres. Dans l'ordre
 *    inverse, l'application passe par un instant sans aucun composant portant
 *    MAIN/LAUNCHER — et certains lanceurs en profitent pour la faire
 *    disparaître du tiroir d'applications.
 *
 * 2. MainActivity ne porte PLUS l'intent-filter LAUNCHER (ce sont les alias qui
 *    l'ont). Il ne faut donc jamais désactiver MainActivity : un alias qui
 *    pointe vers une activité désactivée ne lance rien du tout.
 *
 * 3. Changer d'alias peut faire tomber le raccourci posé sur l'écran d'accueil
 *    (il référence un composant précis). D'où la bascule dans les Réglages et
 *    le fait de ne changer QUE lorsque l'humeur change vraiment — pas à chaque
 *    ouverture de l'application.
 */
@CapacitorPlugin(name = "LennyxIcon")
public class LennyxIconPlugin extends Plugin {

    private static final String PREFS = "LennyxIconPrefs";
    private static final String KEY_MOOD = "mood";

    /** Doit rester synchronisé avec MoodId dans src/game/mood.ts. */
    private static final String[] MOODS = { "glorieux", "fier", "serein", "vigilant", "inquiet", "eteint" };
    private static final String DEFAULT_MOOD = "serein";

    @PluginMethod
    public void current(PluginCall call) {
        JSObject out = new JSObject();
        out.put("mood", prefs().getString(KEY_MOOD, DEFAULT_MOOD));
        out.put("supported", true);
        call.resolve(out);
    }

    @PluginMethod
    public void setMood(PluginCall call) {
        String wanted = normalize(call.getString("mood", DEFAULT_MOOD));
        boolean force = Boolean.TRUE.equals(call.getBoolean("force", false));
        String currentMood = prefs().getString(KEY_MOOD, DEFAULT_MOOD);

        JSObject out = new JSObject();
        if (!force && wanted.equals(currentMood)) {
            // Rien à faire : une bascule d'alias inutile risquerait le raccourci
            // de l'écran d'accueil pour rien.
            out.put("changed", false);
            out.put("mood", currentMood);
            call.resolve(out);
            return;
        }

        try {
            applyAlias(wanted);
            prefs().edit().putString(KEY_MOOD, wanted).apply();
            out.put("changed", true);
            out.put("mood", wanted);
            call.resolve(out);
        } catch (Throwable t) {
            // L'icône est un ornement : son échec ne doit jamais remonter
            // comme une panne de l'application.
            out.put("changed", false);
            out.put("mood", currentMood);
            out.put("error", t.getClass().getSimpleName());
            call.resolve(out);
        }
    }

    /**
     * Revient à l'icône neutre et réactive l'alias par défaut — utilisé quand
     * l'utilisateur désactive la fonction dans les Réglages, pour ne pas le
     * laisser avec une icône « inquiet » définitive.
     */
    @PluginMethod
    public void reset(PluginCall call) {
        JSObject out = new JSObject();
        try {
            applyAlias(DEFAULT_MOOD);
            prefs().edit().putString(KEY_MOOD, DEFAULT_MOOD).apply();
            out.put("mood", DEFAULT_MOOD);
        } catch (Throwable t) {
            out.put("error", t.getClass().getSimpleName());
        }
        call.resolve(out);
    }

    // ── mécanique ───────────────────────────────────────────────────────

    private void applyAlias(String mood) {
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();

        // 1. on allume d'abord la bonne icône
        pm.setComponentEnabledSetting(
            aliasComponent(ctx, mood),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP
        );

        // 2. puis seulement on éteint les autres
        for (String other : MOODS) {
            if (other.equals(mood)) continue;
            pm.setComponentEnabledSetting(
                aliasComponent(ctx, other),
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
        }
    }

    private static ComponentName aliasComponent(Context ctx, String mood) {
        return new ComponentName(ctx, ctx.getPackageName() + ".Launch" + capitalize(mood));
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }

    private static String normalize(String mood) {
        if (mood == null) return DEFAULT_MOOD;
        String m = mood.trim().toLowerCase();
        for (String known : MOODS) if (known.equals(m)) return m;
        return DEFAULT_MOOD;
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
