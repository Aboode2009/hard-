package com.hardchallenge.app.widget;

import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import com.hardchallenge.app.R;

/** 2x2: challenge-progress ring, streak number and a call to action. */
public class StreakWidgetProvider extends BaseWidgetProvider {

    /**
     * Below this width the day (header) and the unit (beside the number) have
     * no room: on a 5-column launcher 2x2 is ~126dp wide, where "اليوم 1 من 21"
     * wrapped and "يوم متواصل" was cut to "يوم". Both then move to one line
     * above the button.
     */
    private static final int COMPACT_MAX_WIDTH_DP = 150;

    @Override
    RemoteViews render(Context ctx, WidgetState s, Bundle options) {
        Context lc = WidgetUpdater.localized(ctx, s);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_streak);
        WidgetUpdater.applyCommon(ctx, v, WidgetUpdater.isRtl(lc), R.id.streak_button);

        v.setTextViewText(R.id.streak_brand, WidgetUpdater.brand(ctx));

        boolean active = s.mode == WidgetState.Mode.ACTIVE;
        v.setViewVisibility(R.id.streak_body, active ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.streak_message, active ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.streak_day, active ? View.VISIBLE : View.INVISIBLE);
        v.setViewVisibility(R.id.streak_sub, View.GONE);

        if (!active) {
            v.setTextViewText(R.id.streak_message, lc.getString(
                    s.mode == WidgetState.Mode.SIGNED_OUT ? R.string.widget_sign_in : R.string.widget_stale));
            v.setTextViewText(R.id.streak_button, lc.getString(R.string.widget_open));
            return v;
        }

        String dayText = lc.getString(R.string.widget_day_of,
                String.valueOf(s.day), String.valueOf(s.totalDays));
        String unitText = WidgetUpdater.plural(lc, R.plurals.widget_streak_unit, s.streak);
        int width = WidgetUpdater.widthDp(options);
        boolean compact = width > 0 && width < COMPACT_MAX_WIDTH_DP;
        v.setViewVisibility(R.id.streak_day, compact ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.streak_unit, compact ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.streak_sub, compact ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.streak_day, dayText);
        v.setTextViewText(R.id.streak_sub, unitText + " · " + dayText);
        v.setImageViewBitmap(R.id.streak_ring,
                WidgetGraphics.ring(ctx, 62, s.totalDays > 0 ? (float) s.day / s.totalDays : 0f));
        v.setTextViewText(R.id.streak_count, String.valueOf(s.streak));
        v.setTextViewText(R.id.streak_unit, unitText);

        int left = s.remaining();
        String cta;
        if (s.dayCompleted) cta = lc.getString(R.string.widget_day_complete);
        else if (left > 0) cta = WidgetUpdater.plural(lc, R.plurals.widget_cta_tasks_left, left);
        else cta = lc.getString(R.string.widget_finish_day);
        v.setTextViewText(R.id.streak_button, cta);
        return v;
    }
}
