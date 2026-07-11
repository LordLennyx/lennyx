package com.lennyx.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pont léger entre l'application web et le widget d'écran d'accueil : reçoit
 * un instantané des données (pas, streak, niveau, prochaine alarme), le
 * range dans SharedPreferences, puis demande au système de redessiner le
 * widget. Aucune donnée ne sort de l'appareil.
 */
@CapacitorPlugin(name = "LennyxWidget")
public class LennyxWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(LennyxWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("name", call.getString("name", "Aventurier"));
        editor.putInt("level", call.getInt("level", 0));
        editor.putInt("stepsToday", call.getInt("stepsToday", 0));
        editor.putInt("stepsGoal", call.getInt("stepsGoal", 8000));
        editor.putInt("streak", call.getInt("streak", 0));
        editor.putString("nextAlarm", call.getString("nextAlarm", ""));
        editor.apply();

        LennyxWidgetProvider.updateAll(ctx);
        call.resolve();
    }
}
