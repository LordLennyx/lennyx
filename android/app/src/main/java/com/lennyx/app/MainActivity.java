package com.lennyx.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LennyxWidgetPlugin.class);
        registerPlugin(LennyxBackgroundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
