package com.lennyx.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Le widget majestueux : niveau, XP, pas, streak, alarme et tâches restantes, en un coup d'œil. */
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

        int stepsPercent = stepsGoal > 0 ? Math.min(100, Math.round(100f * stepsToday / stepsGoal)) : 0;

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pending_intent = null;
        if (launchIntent != null) {
            pending_intent = PendingIntent.getActivity(
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

            StringBuilder extra = new StringBuilder("Streak ").append(streak).append("j");
            if (nextAlarm != null && !nextAlarm.isEmpty()) extra.append("  ·  Réveil ").append(nextAlarm);
            if (pending > 0) extra.append("  ·  ").append(pending).append(pending > 1 ? " tâches" : " tâche");
            else extra.append("  ·  journée à jour");
            views.setTextViewText(R.id.widget_extra, extra.toString());

            if (pending_intent != null) views.setOnClickPendingIntent(R.id.widget_root, pending_intent);
            appWidgetManager.updateAppWidget(id, views);
        }
    }
}
