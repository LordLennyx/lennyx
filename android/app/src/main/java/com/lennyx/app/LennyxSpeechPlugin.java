package com.lennyx.app;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognitionService;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.List;

/**
 * Dictée vocale française, HORS LIGNE et sans la moindre API payante.
 *
 * Android embarque un moteur de reconnaissance (android.speech) que Google
 * alimente avec des paquets de langue téléchargeables gratuitement. Avec
 * EXTRA_PREFER_OFFLINE, la reconnaissance se fait entièrement sur l'appareil :
 * aucun octet ne sort, aucune clé, aucun quota. C'est exactement ce qu'il faut
 * pour annoncer sa journée à voix haute.
 *
 * ⚠️ SpeechRecognizer DOIT vivre sur le thread principal — création, start,
 * stop, destroy. Tout appel depuis le thread de Capacitor lève une exception
 * ou, pire, reste silencieux.
 *
 * ⚠️ Le moteur s'arrête de lui-même au premier silence prolongé. Pour une
 * dictée continue (plusieurs phrases d'affilée, avec des pauses de réflexion),
 * on le RELANCE tant que l'utilisateur n'a pas appuyé sur stop, en cumulant
 * les morceaux dans `accumulated`. Sans ce redémarrage, impossible de dicter
 * plus d'une phrase.
 *
 * ⚠️ Android 11+ : sans la déclaration <queries> de android.speech
 * RecognitionService dans le manifeste, isRecognitionAvailable() renvoie false
 * même quand un moteur est installé (filtrage de visibilité des paquets).
 */
@CapacitorPlugin(
    name = "LennyxSpeech",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class LennyxSpeechPlugin extends Plugin {

    static final String MIC = "microphone";

    /** Silence toléré avant que le moteur ne conclue : on laisse réfléchir. */
    private static final long SILENCE_MS = 2200L;

    private SpeechRecognizer recognizer;
    private final Handler main = new Handler(Looper.getMainLooper());

    /** Tout ce qui a été reconnu depuis l'appui sur le micro. */
    private final StringBuilder accumulated = new StringBuilder();
    /** L'utilisateur veut-il toujours dicter ? Pilote le redémarrage. */
    private volatile boolean listening = false;
    private volatile boolean offlineOnly = true;
    /** Évite de relancer en boucle serrée quand le moteur refuse tout. */
    private int consecutiveFailures = 0;

    // ── état du moteur ──────────────────────────────────────────────────

    @PluginMethod
    public void available(PluginCall call) {
        Context ctx = getContext();
        JSObject out = new JSObject();
        boolean engine = SpeechRecognizer.isRecognitionAvailable(ctx);
        out.put("available", engine);
        out.put("hasPermission", getPermissionState(MIC) == PermissionState.GRANTED);
        out.put("engine", recognitionServiceLabel(ctx));
        // Un moteur présent ne garantit pas le paquet FRANÇAIS hors ligne : on
        // ne peut l'affirmer qu'après un essai réel, d'où le champ « inconnu ».
        out.put("offlineKnown", false);
        call.resolve(out);
    }

    /** Nom du service de reconnaissance installé, pour le diagnostic. */
    private String recognitionServiceLabel(Context ctx) {
        try {
            List<ResolveInfo> services = ctx.getPackageManager()
                .queryIntentServices(new Intent(RecognitionService.SERVICE_INTERFACE), 0);
            if (services != null && !services.isEmpty()) {
                return services.get(0).serviceInfo.packageName;
            }
        } catch (Throwable ignored) {
            /* diagnostic seulement : jamais bloquant */
        }
        return "";
    }

    @PluginMethod
    public void requestMic(PluginCall call) {
        if (getPermissionState(MIC) == PermissionState.GRANTED) {
            JSObject out = new JSObject();
            out.put("granted", true);
            call.resolve(out);
            return;
        }
        requestPermissionForAlias(MIC, call, "micCallback");
    }

    @PermissionCallback
    private void micCallback(PluginCall call) {
        JSObject out = new JSObject();
        out.put("granted", getPermissionState(MIC) == PermissionState.GRANTED);
        call.resolve(out);
    }

    /**
     * Ouvre les réglages de saisie vocale du système : c'est là que
     * l'utilisateur télécharge le paquet français hors ligne (gratuit).
     */
    @PluginMethod
    public void openSettings(PluginCall call) {
        boolean opened = false;
        String[] actions = {
            Settings.ACTION_VOICE_INPUT_SETTINGS,
            "com.android.settings.TTS_SETTINGS",
        };
        // D'abord la page dédiée de l'application Google (où vit la liste des
        // langues hors ligne), puis un repli sur les réglages généraux.
        try {
            Intent direct = new Intent(Intent.ACTION_MAIN);
            direct.setComponent(new ComponentName(
                "com.google.android.googlequicksearchbox",
                "com.google.android.apps.gsa.settingsui.VoiceSearchPreferences"));
            direct.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(direct);
            opened = true;
        } catch (Throwable ignored) {
            for (String action : actions) {
                if (opened) break;
                try {
                    Intent i = new Intent(action);
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(i);
                    opened = true;
                } catch (Throwable ignored2) {
                    /* on essaie le suivant */
                }
            }
        }
        if (!opened) {
            try {
                Intent i = new Intent(Settings.ACTION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                opened = true;
            } catch (Throwable ignored) {
                /* rien à faire de plus */
            }
        }
        JSObject out = new JSObject();
        out.put("opened", opened);
        call.resolve(out);
    }

    // ── dictée ──────────────────────────────────────────────────────────

    @PluginMethod
    public void start(final PluginCall call) {
        if (getPermissionState(MIC) != PermissionState.GRANTED) {
            call.reject("permission-microphone");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("moteur-absent");
            return;
        }
        offlineOnly = Boolean.TRUE.equals(call.getBoolean("offlineOnly", true));
        accumulated.setLength(0);
        consecutiveFailures = 0;
        listening = true;

        main.post(new Runnable() {
            @Override
            public void run() {
                try {
                    createRecognizer();
                    listen();
                    call.resolve();
                } catch (Throwable t) {
                    listening = false;
                    call.reject("demarrage-impossible: " + t.getClass().getSimpleName());
                }
            }
        });
    }

    @PluginMethod
    public void stop(final PluginCall call) {
        listening = false;
        main.post(new Runnable() {
            @Override
            public void run() {
                try {
                    if (recognizer != null) recognizer.stopListening();
                } catch (Throwable ignored) {
                    /* le moteur était déjà au repos */
                }
                JSObject out = new JSObject();
                out.put("text", accumulated.toString().trim());
                call.resolve(out);
            }
        });
    }

    @PluginMethod
    public void cancel(final PluginCall call) {
        listening = false;
        main.post(new Runnable() {
            @Override
            public void run() {
                destroyRecognizer();
                accumulated.setLength(0);
                call.resolve();
            }
        });
    }

    private void createRecognizer() {
        destroyRecognizer();
        recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { emit("ready", "", false); }
            @Override public void onBeginningOfSpeech() { }
            @Override public void onRmsChanged(float rmsdB) {
                // niveau sonore : alimente l'animation du micro
                JSObject data = new JSObject();
                data.put("level", Math.max(0f, Math.min(1f, (rmsdB + 2f) / 12f)));
                notifyListeners("level", data);
            }
            @Override public void onBufferReceived(byte[] buffer) { }
            @Override public void onEndOfSpeech() { }

            @Override
            public void onError(int error) {
                // Un silence ou une non-reconnaissance ne sont PAS des échecs :
                // l'utilisateur réfléchit. On relance sans rien dire.
                boolean benign = error == SpeechRecognizer.ERROR_NO_MATCH
                    || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT;
                if (benign && listening) {
                    consecutiveFailures++;
                    if (consecutiveFailures <= 40) {
                        relisten();
                        return;
                    }
                }
                listening = false;
                emit("error", errorLabel(error), true);
                destroyRecognizer();
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                String piece = firstResult(partialResults);
                if (piece.isEmpty()) return;
                emit("partial", join(accumulated.toString(), piece), false);
            }

            @Override
            public void onResults(Bundle results) {
                consecutiveFailures = 0;
                String piece = firstResult(results);
                if (!piece.isEmpty()) {
                    String merged = join(accumulated.toString(), piece);
                    accumulated.setLength(0);
                    accumulated.append(merged);
                }
                if (listening) {
                    emit("partial", accumulated.toString(), false);
                    relisten();
                } else {
                    emit("final", accumulated.toString(), true);
                    destroyRecognizer();
                }
            }

            @Override public void onEvent(int eventType, Bundle params) { }
        });
    }

    /** Relance l'écoute après un court répit, pour une dictée continue. */
    private void relisten() {
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!listening) return;
                try {
                    listen();
                } catch (Throwable t) {
                    listening = false;
                    emit("error", "relance-impossible", true);
                }
            }
        }, 120L);
    }

    private void listen() {
        if (recognizer == null) createRecognizer();
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR");
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "fr-FR");
        intent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, true);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, SILENCE_MS);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, SILENCE_MS);
        // Le cœur de la promesse « hors ligne, sans API » : la reconnaissance
        // se fait sur l'appareil. Disponible depuis l'API 23.
        if (offlineOnly) intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        recognizer.startListening(intent);
    }

    private void destroyRecognizer() {
        if (recognizer == null) return;
        try {
            recognizer.cancel();
            recognizer.destroy();
        } catch (Throwable ignored) {
            /* rien à sauver */
        }
        recognizer = null;
    }

    // ── utilitaires ─────────────────────────────────────────────────────

    private static String firstResult(Bundle b) {
        if (b == null) return "";
        ArrayList<String> list = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list == null || list.isEmpty()) return "";
        String s = list.get(0);
        return s == null ? "" : s.trim();
    }

    /** Recolle deux morceaux de dictée sans doubler ni coller les espaces. */
    private static String join(String a, String b) {
        if (a == null || a.trim().isEmpty()) return b.trim();
        if (b == null || b.trim().isEmpty()) return a.trim();
        return a.trim() + " " + b.trim();
    }

    private void emit(String event, String text, boolean done) {
        JSObject data = new JSObject();
        data.put("text", text);
        data.put("done", done);
        notifyListeners(event, data);
    }

    private static String errorLabel(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "audio";
            case SpeechRecognizer.ERROR_CLIENT: return "client";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "permission-microphone";
            case SpeechRecognizer.ERROR_NETWORK: return "reseau";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "reseau-delai";
            case SpeechRecognizer.ERROR_NO_MATCH: return "rien-compris";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "moteur-occupe";
            case SpeechRecognizer.ERROR_SERVER: return "serveur";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "silence";
            default: return "inconnu-" + error;
        }
    }

    @Override
    protected void handleOnDestroy() {
        listening = false;
        main.post(new Runnable() {
            @Override public void run() { destroyRecognizer(); }
        });
        super.handleOnDestroy();
    }
}
