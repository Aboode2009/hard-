package com.hardchallenge.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Fires just after Baghdad midnight: redraw for the new day, then re-arm. */
public class WidgetMidnightReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        WidgetUpdater.updateAll(ctx);
        if (WidgetUpdater.anyPlaced(ctx)) WidgetUpdater.scheduleMidnight(ctx);
    }
}
