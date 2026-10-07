package com.hardchallenge.app.widget;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge between the web app and the home-screen widgets.
 *
 * - update({ snapshot }): stores the JSON snapshot (see src/lib/widget-sync.ts)
 *   in SharedPreferences and redraws every placed widget.
 * - "openTasks" event: a widget was tapped. Retained until JS listens, so a
 *   cold start from a widget still lands on the tasks page.
 *
 * The widget intent carries only a boolean, never a route: MainActivity is
 * exported, so a route string would let any app open arbitrary screens.
 */
@CapacitorPlugin(name = "HardWidget")
public class HardWidgetPlugin extends Plugin {
    static final String ACTION_OPEN_TASKS = "com.hardchallenge.app.widget.OPEN_TASKS";
    static final String EXTRA_OPEN_TASKS = "com.hardchallenge.app.widget.EXTRA_OPEN_TASKS";

    @Override
    public void load() {
        if (getActivity() != null) consumeOpenIntent(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        consumeOpenIntent(intent);
    }

    private void consumeOpenIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra(EXTRA_OPEN_TASKS, false)) return;
        // Consumed once: a recreated activity must not navigate again.
        intent.removeExtra(EXTRA_OPEN_TASKS);
        notifyListeners("openTasks", new JSObject(), true);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String snapshot = call.getString("snapshot");
        if (snapshot == null) {
            call.reject("snapshot is required");
            return;
        }
        WidgetState.save(getContext(), snapshot);
        WidgetUpdater.updateAll(getContext());
        call.resolve();
    }
}
