package com.lennyx.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

/**
 * Le widget majestueux : niveau, XP, pas, streak, alarme et tâches restantes,
 * en un coup d'œil — et, depuis la v0.9, le VISAGE de Lennyx.
 *
 * Le blason, la couleur du liseré, la phrase et la mise en avant de la
 * prochaine tâche viennent tous du moteur d'humeur (src/game/mood.ts), poussé
 * ici par LennyxWidgetPlugin. Le widget ne calcule rien : il affiche.
 *
 * ⚠️ Les ressources d'humeur sont résolues par un `switch` explicite plutôt que
 * par getIdentifier() : c'est vérifié à la compilation, et ça survivra à un
 * éventuel shrinkResources.
 */
public class LennyxWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "LennyxWidgetPrefs";

    public static void updateAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, LennyxWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(cn);
        if (ids.length > 0) {
            new LennyxWidgetProvider().onUpdate(context, mgr, ids);
        }
    }

    /** Blason d'humeur : le « L » paré de sa couleur du moment. */
    private static int crestFor(String mood) {
        if (mood == null) return R.drawable.crest_serein;
        switch (mood) {
            case "glorieux": return R.drawable.crest_glorieux;
            case "fier": return R.drawable.crest_fier;
            case "vigilant": return R.drawable.crest_vigilant;
            case "inquiet": return R.drawable.crest_inquiet;
            case "eteint": return R.drawable.crest_eteint;
            default: return R.drawable.crest_serein;
        }
    }

    /** Cadre du widget : même code couleur que le blason. */
    private static int frameFor(String mood) {
        if (mood == null) return R.drawable.widget_frame_serein;
        switch (mood) {
            case "glorieux": return R.drawable.widget_frame_glorieux;
            case "fier": return R.drawable.widget_frame_fier;
            case "vigilant": return R.drawable.widget_frame_vigilant;
            case "inquiet": return R.drawable.widget_frame_inquiet;
            case "eteint": return R.drawable.widget_frame_eteint;
            default: return R.drawable.widget_frame_serein;
        }
    }

    /** Teinte de la phrase d'humeur. Doit suivre MOODS dans mood.ts. */
    private static int tintFor(String mood) {
        if (mood == null) return Color.parseColor("#9AA7B4");
        switch (mood) {
            case "glorieux": return Color.parseColor("#F4DD8C");
            case "fier": return Color.parseColor("#D4AF37");
            case "vigilant": return Color.parseColor("#E8964A");
            case "inquiet": return Color.parseColor("#C76B4A");
            case "eteint": return Color.parseColor("#8F8A80");
            default: return Color.parseColor("#9AA7B4");
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String name = prefs.getString("name", "Aventurier");
        int level = prefs.getInt("level", 0);
        String rank = prefs.getString("rank", "Newcomer");
        int xpPercent = prefs.getInt("xpPercent", 0);
        int stepsToday = prefs.getInt("stepsToday", 0);
        int stepsGoal = prefs.getInt("stepsGoal", 8000);
        int streak = prefs.getInt("streak", 0);
        int pending = prefs.getInt("pending", 0);
        String nextAlarm = prefs.getString("nextAlarm", "");

        // ── humeur ──
        String mood = prefs.getString("mood", "serein");
        String moodLine = prefs.getString("moodLine", "");
        String nextTask = prefs.getString("nextTask", "");
        int doneToday = prefs.getInt("doneToday", 0);
        int totalToday = prefs.getInt("totalToday", 0);

        int stepsPercent = stepsGoal > 0 ? Math.min(100, Math.round(100f * stepsToday / stepsGoal)) : 0;

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent openApp = null;
        if (launchIntent != null) {
            openApp = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_lennyx);
            views.setTextViewText(R.id.widget_name, name);
            views.setTextViewText(R.id.widget_level, "Niv. " + level);
            views.setTextViewText(R.id.widget_rank, rank);
            views.setProgressBar(R.id.widget_xp_bar, 100, xpPercent, false);
            views.setTextViewText(R.id.widget_steps, stepsToday + " / " + stepsGoal + " pas");
            views.setProgressBar(R.id.widget_steps_bar, 100, stepsPercent, false);

            // le visage du jour
            views.setImageViewResource(R.id.widget_crest, crestFor(mood));
            views.setInt(R.id.widget_root, "setBackgroundResource", frameFor(mood));
            views.setTextViewText(R.id.widget_mood, moodLine);
            views.setTextColor(R.id.widget_mood, tintFor(mood));

            if (nextTask != null && !nextTask.isEmpty()) {
                views.setTextViewText(R.id.widget_next, "→ " + nextTask);
                views.setViewVisibility(R.id.widget_next, android.view.View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_next, android.view.View.GONE);
            }

            StringBuilder extra = new StringBuilder("Streak ").append(streak).append(" j");
            if (totalToday > 0) extra.append("  ·  ").append(doneToday).append('/').append(totalToday).append(" du jour");
            if (nextAlarm != null && !nextAlarm.isEmpty()) extra.append("  ·  Réveil ").append(nextAlarm);
            if (pending > 0) extra.append("  ·  ").append(pending).append(pending > 1 ? " restantes" : " restante");
            else if (totalToday > 0) extra.append("  ·  journée bouclée");
            views.setTextViewText(R.id.widget_extra, extra.toString());

            if (openApp != null) views.setOnClickPendingIntent(R.id.widget_root, openApp);
            appWidgetManager.updateAppWidget(id, views);
        }
    }
}
