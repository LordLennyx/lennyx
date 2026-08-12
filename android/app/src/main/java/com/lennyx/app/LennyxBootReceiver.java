package com.lennyx.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

/**
 * « Du démarrage à l'extinction » : relance le service de présence dès que le
 * téléphone a fini de démarrer, sans que l'utilisateur ait à ouvrir l'app.
 * Ne redémarre que si la présence avait été activée avant l'extinction.
 */
public class LennyxBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
            && !"android.intent.action.QUICKBOOT_POWERON".equals(action)
            && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        SharedPreferences prefs =
            context.getSharedPreferences(LennyxStepService.PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(LennyxStepService.KEY_ENABLED, false)) return;

        // La permission a pu être révoquée entre-temps : la redemander est
        // impossible sans interface, et démarrer sans elle ferait planter.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && context.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        try {
            Intent service = new Intent(context, LennyxStepService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(service);
            } else {
                context.startService(service);
            }
        } catch (Exception ignored) {
            // Android peut refuser un démarrage au boot selon l'état du système :
            // l'application relancera le service à sa prochaine ouverture.
        }
    }
}
