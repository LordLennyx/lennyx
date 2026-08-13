package com.lennyx.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

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

    /**
     * Transmet au service les pas déjà comptés aujourd'hui (par l'accéléromètre),
     * pour qu'il démarre avec cet acquis au lieu de repartir de zéro.
     */
    private void applyOffset(PluginCall call) {
        Integer offset = call.getInt("offsetToday");
        if (offset == null || offset <= 0) return;
        String day = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            .format(new java.util.Date());
        SharedPreferences p = prefs();
        int known = Math.max(p.getInt("offset-" + day, 0), p.getInt("steps-" + day, 0));
        if (offset > known) {
            p.edit().putInt("offset-" + day, offset).apply();
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasActivityPermission()) {
            requestPermissionForAlias("activity", call, "activityPermissionCallback");
            return;
        }
        applyOffset(call);
        launchService();
        JSObject ret = new JSObject();
        ret.put("running", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void activityPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        if (hasActivityPermission()) {
            applyOffset(call);
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
        LennyxWatchdogReceiver.cancel(ctx);
        ctx.stopService(new Intent(ctx, LennyxStepService.class));
        JSObject ret = new JSObject();
        ret.put("running", false);
        call.resolve(ret);
    }

    /** Quel podomètre matériel ce téléphone possède-t-il, s'il en a un ? */
    private String availableSensor() {
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (sm == null) return "none";
        if (sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null) return "counter";
        if (sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null) return "detector";
        if (sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null) return "accel";
        return "none";
    }

    /**
     * Les surcouches constructeur (One UI en tête) endorment les applications
     * qui ne sont pas explicitement exemptées : le service est tué et le
     * comptage s'arrête dès l'écran éteint. Savoir si l'exemption est accordée
     * est donc la première question du diagnostic.
     */
    private boolean batteryExempt() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    @PluginMethod
    public void status(PluginCall call) {
        SharedPreferences p = prefs();
        JSObject ret = new JSObject();
        ret.put("enabled", p.getBoolean(LennyxStepService.KEY_ENABLED, false));
        ret.put("permission", hasActivityPermission());
        // Le capteur théoriquement disponible, et celui que le service utilise
        // réellement : un écart entre les deux signale un service qui n'a jamais
        // démarré.
        ret.put("hasStepSensor", !"none".equals(availableSensor()));
        ret.put("available", availableSensor());
        ret.put("sensor", p.getString(LennyxStepService.KEY_SENSOR, "none"));
        ret.put("lastUpdate", p.getLong("lastUpdate", 0));
        ret.put("heartbeat", p.getLong(LennyxStepService.KEY_HEARTBEAT, 0));
        ret.put("batteryExempt", batteryExempt());
        call.resolve(ret);
    }

    /** Ouvre la demande système d'exemption d'optimisation de batterie. */
    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        JSObject ret = new JSObject();
        if (batteryExempt()) {
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            // Certains constructeurs bloquent cet écran : on ouvre la fiche de
            // l'application, d'où l'utilisateur peut faire le réglage à la main.
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
            } catch (Exception ignored) { }
        }
        ret.put("granted", false);
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
