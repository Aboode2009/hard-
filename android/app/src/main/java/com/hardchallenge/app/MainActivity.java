package com.hardchallenge.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.hardchallenge.app.widget.HardWidgetPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local (in-app) plugins must be registered before the bridge starts.
        registerPlugin(HardWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
