package com.lennyx.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

        Intent service = new Intent(context, LennyxStepService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(service);
        } else {
            context.startService(service);
        }
    }
}
