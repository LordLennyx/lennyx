package com.lennyx.app;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.List;

/**
 * Pont web → natif pour les réveils et berceuses.
 *
 * La couche web reste maîtresse du réglage (heure, jours, extrait audio, image
 * de fond) ; elle dépose ici la configuration, et c'est Android qui prend le
 * relais — seul capable de sonner et de s'afficher quand l'application est
 * fermée, l'écran verrouillé ou éteint.
 */
@CapacitorPlugin(name = "LennyxAlarm")
public class LennyxAlarmPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(LennyxAlarmReceiver.PREFS, Context.MODE_PRIVATE);
    }

    /** Les chemins arrivent en file:// depuis Filesystem : le natif veut un chemin nu. */
    private static String plainPath(String raw) {
        if (raw == null) return null;
        if (raw.startsWith("file://")) return Uri.parse(raw).getPath();
        return raw;
    }

    private static String daysToCsv(JSArray days) {
        if (days == null) return "";
        try {
            List<Object> list = days.toList();
            StringBuilder sb = new StringBuilder();
            for (Object o : list) {
                if (sb.length() > 0) sb.append(',');
                sb.append(String.valueOf(o).trim());
            }
            return sb.toString();
        } catch (JSONException e) {
            return "";
        }
    }

    /**
     * Enregistre (ou met à jour) un réveil. Appelé à chaque modification côté
     * web : on réécrit tout puis on reprogramme, c'est plus sûr qu'un diff.
     */
    @PluginMethod
    public void configure(PluginCall call) {
        String kind = call.getString("kind", "wake");
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        String time = call.getString("time", "07:00");

        SharedPreferences.Editor e = prefs().edit();
        // Un essai interrompu a pu laisser ses drapeaux : le réglage fait foi.
        e.remove(kind + ".preview").remove(kind + ".previewWasOn");
        e.putBoolean(kind + ".on", on);
        e.putString(kind + ".time", time);
        e.putString(kind + ".days", daysToCsv(call.getArray("days")));
        e.putString(kind + ".label", call.getString("label", ""));
        e.putInt(kind + ".repeatMin", call.getInt("repeatMin", 5));
        e.putFloat(kind + ".volume", call.getFloat("volume", 1f));

        String audio = plainPath(call.getString("audioPath"));
        if (audio == null) {
            e.remove(kind + ".audio");
        } else {
            e.putString(kind + ".audio", audio);
        }
        e.putInt(kind + ".startMs", call.getInt("startMs", 0));
        e.putInt(kind + ".endMs", call.getInt("endMs", 0));

        String image = plainPath(call.getString("imagePath"));
        if (image == null) {
            e.remove(kind + ".image");
        } else {
            e.putString(kind + ".image", image);
        }
        e.apply();

        LennyxAlarmReceiver.cancel(getContext(), kind);
        JSObject ret = new JSObject();
        if (on) {
            long at = LennyxAlarmReceiver.nextOccurrence(
                time, LennyxAlarmService.decodeDays(prefs().getString(kind + ".days", ""))
            );
            LennyxAlarmReceiver.scheduleAt(getContext(), kind, at);
            ret.put("nextAt", at);
        }
        ret.put("scheduled", on);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String kind = call.getString("kind", "wake");
        prefs().edit().putBoolean(kind + ".on", false).apply();
        LennyxAlarmReceiver.cancel(getContext(), kind);
        call.resolve();
    }

    /** Déclenche immédiatement le réveil : indispensable pour l'essayer. */
    @PluginMethod
    public void preview(PluginCall call) {
        String kind = call.getString("kind", "wake");
        Intent svc = new Intent(getContext(), LennyxAlarmService.class);
        svc.putExtra(LennyxAlarmReceiver.EXTRA_KIND, kind);
        // Un essai ne doit rien changer au réglage : ni se relancer toutes les
        // cinq minutes, ni — surtout — armer un réveil que l'utilisateur avait
        // laissé éteint. Le drapeau « preview » dit au service de tout remettre
        // en l'état à l'arrêt.
        prefs().edit()
            .putBoolean(kind + ".preview", true)
            .putBoolean(kind + ".previewWasOn", prefs().getBoolean(kind + ".on", false))
            .putBoolean(kind + ".on", true)
            .apply();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(svc);
            } else {
                getContext().startService(svc);
            }
        } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        LennyxAlarmService.stopFromUi(getContext(), false);
        call.resolve();
    }

    /**
     * Sur Android 14+, l'intention plein écran n'est plus accordée d'office :
     * sans elle, le réveil se réduit à une notification — précisément ce que
     * l'utilisateur reprochait.
     */
    private boolean canFullScreen() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true;
        NotificationManager nm = (NotificationManager) getContext()
            .getSystemService(Context.NOTIFICATION_SERVICE);
        return nm == null || nm.canUseFullScreenIntent();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("fullScreen", canFullScreen());
        ret.put("alarmVolumeSilent", LennyxAlarmService.alarmVolumeSilent(getContext()));
        call.resolve(ret);
    }

    /** Ouvre le réglage système d'autorisation plein écran. */
    @PluginMethod
    public void requestFullScreen(PluginCall call) {
        JSObject ret = new JSObject();
        if (canFullScreen()) {
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
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

    /**
     * Dépose un fichier (extrait audio ou image de fond) dans le stockage privé
     * de l'application et renvoie son chemin, à repasser tel quel à configure().
     *
     * On écrit nous-mêmes plutôt que d'ajouter une dépendance de système de
     * fichiers : une vingtaine de lignes contre un paquet de plus, pour un
     * besoin qui se limite à « poser deux fichiers par réveil ».
     */
    @PluginMethod
    public void saveMedia(PluginCall call) {
        String name = call.getString("name");
        String base64 = call.getString("data");
        if (name == null || base64 == null) {
            call.reject("nom ou contenu manquant");
            return;
        }
        // Le nom vient de la couche web : on refuse tout ce qui pourrait sortir
        // du dossier de l'application.
        String safe = name.replaceAll("[^A-Za-z0-9._-]", "_");
        try {
            java.io.File dir = new java.io.File(getContext().getFilesDir(), "alarms");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("dossier illisible");
                return;
            }
            java.io.File out = new java.io.File(dir, safe);
            byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            java.io.FileOutputStream fos = new java.io.FileOutputStream(out);
            try {
                fos.write(bytes);
            } finally {
                fos.close();
            }
            JSObject ret = new JSObject();
            ret.put("path", out.getAbsolutePath());
            ret.put("bytes", bytes.length);
            call.resolve(ret);
        } catch (Throwable t) {
            call.reject("écriture impossible : " + t.getMessage());
        }
    }

    /**
     * Récupère (et efface) le dernier arrêt de réveil enregistré par l'écran
     * natif, pour que le journal de réveil de l'application reste juste même
     * quand elle n'était pas ouverte.
     */
    @PluginMethod
    public void consumeStopped(PluginCall call) {
        SharedPreferences p = prefs();
        JSObject ret = new JSObject();
        for (String kind : new String[] { "wake", "lullaby" }) {
            String date = p.getString("stopped." + kind + ".date", null);
            String time = p.getString("stopped." + kind + ".time", null);
            if (date != null && time != null) {
                JSObject entry = new JSObject();
                entry.put("date", date);
                entry.put("time", time);
                ret.put(kind, entry);
                p.edit()
                    .remove("stopped." + kind + ".date")
                    .remove("stopped." + kind + ".time")
                    .apply();
            }
        }
        call.resolve(ret);
    }
}
