package com.lennyx.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Le widget majestueux : pas, streak et prochaine alarme, en un coup d'œil. */
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
        int level = prefs.getInt("level", 0);
        int stepsToday = prefs.getInt("stepsToday", 0);
        int stepsGoal = prefs.getInt("stepsGoal", 8000);
        int streak = prefs.getInt("streak", 0);
        String nextAlarm = prefs.getString("nextAlarm", "");

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pending = null;
        if (launchIntent != null) {
            pending = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_lennyx);
            views.setTextViewText(R.id.widget_level, "Niv. " + level);
            views.setTextViewText(R.id.widget_steps, stepsToday + " / " + stepsGoal + " pas");
            String extra = "Streak " + streak + "j";
            if (nextAlarm != null && !nextAlarm.isEmpty()) extra += "  ·  Réveil " + nextAlarm;
            views.setTextViewText(R.id.widget_extra, extra);
            if (pending != null) views.setOnClickPendingIntent(R.id.widget_root, pending);
            appWidgetManager.updateAppWidget(id, views);
        }
    }
}
