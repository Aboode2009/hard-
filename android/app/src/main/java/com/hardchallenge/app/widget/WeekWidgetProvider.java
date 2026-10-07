package com.hardchallenge.app.widget;

import android.content.Context;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.view.View;
import android.widget.RemoteViews;

import com.hardchallenge.app.R;

/** 4x1: streak, what's left today, the week as dots, and an Open button. */
public class WeekWidgetProvider extends BaseWidgetProvider {
    private static final int[] LETTERS = {
            R.id.week_letter_0, R.id.week_letter_1, R.id.week_letter_2, R.id.week_letter_3,
            R.id.week_letter_4, R.id.week_letter_5, R.id.week_letter_6,
    };
    private static final int[] DOTS = {
            R.id.week_dot_0, R.id.week_dot_1, R.id.week_dot_2, R.id.week_dot_3,
            R.id.week_dot_4, R.id.week_dot_5, R.id.week_dot_6,
    };

    /** A single row on many launchers is short; below this, drop letters and flame. */
    private static final int FULL_MIN_HEIGHT_DP = 76;

    @Override
    RemoteViews render(Context ctx, WidgetState s, Bundle options) {
        Context lc = WidgetUpdater.localized(ctx, s);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_week);
        WidgetUpdater.applyCommon(ctx, v, WidgetUpdater.isRtl(lc), R.id.week_button);
        v.setTextViewText(R.id.week_button, lc.getString(R.string.widget_open));

        boolean active = s.mode == WidgetState.Mode.ACTIVE;
        v.setViewVisibility(R.id.week_streak, active ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.week_body, active ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.week_message, active ? View.GONE : View.VISIBLE);

        if (!active) {
            v.setTextViewText(R.id.week_message, lc.getString(
                    s.mode == WidgetState.Mode.SIGNED_OUT ? R.string.widget_sign_in : R.string.widget_stale));
            return v;
        }

        int height = WidgetUpdater.heightDp(options);
        boolean full = height == 0 || height >= FULL_MIN_HEIGHT_DP;
        v.setViewVisibility(R.id.week_letters, full ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.week_flame, full ? View.VISIBLE : View.GONE);

        v.setTextViewText(R.id.week_count, String.valueOf(s.streak));
        v.setTextViewText(R.id.week_unit, WidgetUpdater.plural(lc, R.plurals.widget_day_unit, s.streak));

        int left = s.remaining();
        String title;
        if (s.dayCompleted) title = lc.getString(R.string.widget_all_done_today);
        else if (left > 0) title = WidgetUpdater.plural(lc, R.plurals.widget_tasks_left_today, left);
        else title = lc.getString(R.string.widget_finish_day);
        v.setTextViewText(R.id.week_title, title);

        String[] letters = lc.getResources().getStringArray(R.array.widget_week_letters);
        int muted = ctx.getColor(R.color.widget_muted);
        int text = ctx.getColor(R.color.widget_text);
        for (int i = 0; i < 7; i++) {
            int status = s.week[i];
            boolean today = status == WidgetState.WEEK_TODAY;
            SpannableString letter = new SpannableString(letters[i]);
            if (today) {
                letter.setSpan(new StyleSpan(Typeface.BOLD), 0, letter.length(),
                        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            }
            v.setTextViewText(LETTERS[i], letter);
            v.setTextColor(LETTERS[i], today ? text : muted);
            v.setImageViewResource(DOTS[i],
                    status == WidgetState.WEEK_DONE ? R.drawable.widget_dot_done
                            : today ? R.drawable.widget_dot_today
                            : R.drawable.widget_dot_idle);
        }
        return v;
    }
}
