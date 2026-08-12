package com.lennyx.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Map;

/**
 * Pont entre la couche web et le service de présence permanente.
 * Permet d'activer/couper la présence, de connaître son état, et de récupérer
 * les pas comptés en arrière-plan (y compris application fermée).
 */
@CapacitorPlugin(
    name = "LennyxBackground",
    permissions = {
        @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
    }
)
public class LennyxBackgroundPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(LennyxStepService.PREFS, Context.MODE_PRIVATE);
    }

    private boolean hasActivityPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return getContext().checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
            == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasActivityPermission()) {
            requestPermissionForAlias("activity", call, "activityPermissionCallback");
            return;
        }
        launchService();
        JSObject ret = new JSObject();
        ret.put("running", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void activityPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        if (hasActivityPermission()) {
            launchService();
            ret.put("running", true);
        } else {
            ret.put("running", false);
            ret.put("denied", true);
        }
        call.resolve(ret);
    }

    private void launchService() {
        Context ctx = getContext();
        Intent service = new Intent(ctx, LennyxStepService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(service);
        } else {
            ctx.startService(service);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        prefs().edit().putBoolean(LennyxStepService.KEY_ENABLED, false).apply();
        ctx.stopService(new Intent(ctx, LennyxStepService.class));
        JSObject ret = new JSObject();
        ret.put("running", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", prefs().getBoolean(LennyxStepService.KEY_ENABLED, false));
        ret.put("permission", hasActivityPermission());
        ret.put("lastUpdate", prefs().getLong("lastUpdate", 0));
        call.resolve(ret);
    }

    /** Renvoie tous les compteurs journaliers accumulés par le service. */
    @PluginMethod
    public void getSteps(PluginCall call) {
        JSObject days = new JSObject();
        for (Map.Entry<String, ?> e : prefs().getAll().entrySet()) {
            String key = e.getKey();
            if (key.startsWith("steps-") && e.getValue() instanceof Integer) {
                days.put(key.substring(6), (Integer) e.getValue());
            }
        }
        JSObject ret = new JSObject();
        ret.put("days", days);
        call.resolve(ret);
    }
}
