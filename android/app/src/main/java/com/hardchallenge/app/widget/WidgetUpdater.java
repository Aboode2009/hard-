package com.hardchallenge.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.view.View;
import android.widget.RemoteViews;

import com.hardchallenge.app.MainActivity;
import com.hardchallenge.app.R;

import java.util.Locale;

/** Refreshing, scheduling and the bits every widget shares. */
final class WidgetUpdater {
    private WidgetUpdater() {}

    /** Re-render every placed widget of all three kinds. */
    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        BaseWidgetProvider[] providers = {
                new StreakWidgetProvider(), new TasksWidgetProvider(), new WeekWidgetProvider(),
        };
        for (BaseWidgetProvider p : providers) {
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, p.getClass()));
            if (ids.length > 0) p.updateWidgets(ctx, mgr, ids);
        }
    }

    static boolean anyPlaced(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        Class<?>[] kinds = { StreakWidgetProvider.class, TasksWidgetProvider.class, WeekWidgetProvider.class };
        for (Class<?> k : kinds) {
            if (mgr.getAppWidgetIds(new ComponentName(ctx, k)).length > 0) return true;
        }
        return false;
    }

    // ── Baghdad midnight ─────────────────────────────────────────────────

    private static PendingIntent midnightIntent(Context ctx) {
        Intent intent = new Intent(ctx, WidgetMidnightReceiver.class);
        return PendingIntent.getBroadcast(ctx, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * Refresh just after the next Baghdad midnight, so a new day shows without
     * the app being opened.
     *
     * A non-waking alarm with a 10-minute window: needs no exact-alarm
     * permission, and a phone with its screen off shows no widget anyway, so
     * waiting for the screen to come on costs nothing. The 30-minute periodic
     * update backs this up.
     */
    static void scheduleMidnight(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am == null) return;
        long at = WidgetDates.nextBaghdadMidnightMs(System.currentTimeMillis()) + 5_000L;
        am.setWindow(AlarmManager.RTC, at, 10 * 60_000L, midnightIntent(ctx));
    }

    static void cancelMidnight(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am != null) am.cancel(midnightIntent(ctx));
    }

    // ── Shared rendering helpers ────────────────────────────────────────

    /**
     * Resources in the APP's language rather than the device's, so plurals
     * follow Arabic rules (مهمة / مهمتان / مهام) whenever the app is in Arabic.
     * Without a snapshot there is no app language yet; the device's is used.
     */
    static Context localized(Context ctx, WidgetState state) {
        if (state.lang == null) return ctx;
        Configuration config = new Configuration(ctx.getResources().getConfiguration());
        Locale locale = new Locale(state.lang);
        config.setLocale(locale);
        config.setLayoutDirection(locale);
        return ctx.createConfigurationContext(config);
    }

    static boolean isRtl(Context localized) {
        return localized.getResources().getConfiguration().getLayoutDirection()
                == View.LAYOUT_DIRECTION_RTL;
    }

    /** Direction from the app's language, and the whole widget opens the tasks page. */
    static void applyCommon(Context ctx, RemoteViews views, boolean rtl, int... clickableIds) {
        views.setInt(R.id.widget_root, "setLayoutDirection",
                rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR);
        PendingIntent open = openTasksIntent(ctx);
        views.setOnClickPendingIntent(R.id.widget_root, open);
        for (int id : clickableIds) views.setOnClickPendingIntent(id, open);
    }

    private static PendingIntent openTasksIntent(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class)
                .setAction(HardWidgetPlugin.ACTION_OPEN_TASKS)
                .putExtra(HardWidgetPlugin.EXTRA_OPEN_TASKS, true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String plural(Context lc, int id, int n) {
        return lc.getResources().getQuantityString(id, n, String.valueOf(n));
    }

    /** "HARD 21" with the 21 in pink. */
    static CharSequence brand(Context ctx) {
        SpannableString s = new SpannableString("HARD 21");
        s.setSpan(new ForegroundColorSpan(ctx.getColor(R.color.widget_pink)),
                5, 7, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return s;
    }

    /**
     * Portrait width of the widget in dp, or 0 when the launcher didn't say.
     * (In portrait the launcher reports MIN_WIDTH and MAX_HEIGHT.)
     */
    static int widthDp(Bundle options) {
        return options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
    }

    /** Portrait height of the widget in dp, or 0 when the launcher didn't say. */
    static int heightDp(Bundle options) {
        return options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
    }
}
