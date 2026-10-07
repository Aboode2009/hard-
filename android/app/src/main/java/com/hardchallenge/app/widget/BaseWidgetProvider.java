package com.hardchallenge.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.widget.RemoteViews;

/**
 * Shared lifecycle for the three widgets. Each subclass only turns a
 * WidgetState into RemoteViews; loading, sizing and scheduling live here.
 */
public abstract class BaseWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "HardWidget";

    abstract RemoteViews render(Context ctx, WidgetState state, Bundle options);

    void updateWidgets(Context ctx, AppWidgetManager mgr, int[] ids) {
        WidgetState state = WidgetState.load(ctx);
        for (int id : ids) {
            try {
                mgr.updateAppWidget(id, render(ctx, state, mgr.getAppWidgetOptions(id)));
            } catch (RuntimeException e) {
                // One bad render must not leave the other widgets stale.
                Log.e(TAG, "Rendering widget " + id + " failed", e);
            }
        }
    }

    /** Placement, the 30-minute tick, and reboots all arrive here. */
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        updateWidgets(ctx, mgr, ids);
        WidgetUpdater.scheduleMidnight(ctx);
    }

    /** Resized: some layouts drop rows when short. */
    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle options) {
        updateWidgets(ctx, mgr, new int[] { id });
    }

    @Override
    public void onDisabled(Context ctx) {
        if (!WidgetUpdater.anyPlaced(ctx)) WidgetUpdater.cancelMidnight(ctx);
    }
}
