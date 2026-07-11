package com.lennyx.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LennyxWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
