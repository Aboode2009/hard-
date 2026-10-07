package com.hardchallenge.app.widget;

import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import com.hardchallenge.app.R;

import java.util.ArrayList;
import java.util.List;

/** 4x2: today's tasks with ticks, the done count, a bar and the streak line. */
public class TasksWidgetProvider extends BaseWidgetProvider {
    private static final int[] CARDS = { R.id.task_card_0, R.id.task_card_1, R.id.task_card_2, R.id.task_card_3 };
    private static final int[] CHECKS = { R.id.task_check_0, R.id.task_check_1, R.id.task_check_2, R.id.task_check_3 };
    private static final int[] TITLES = { R.id.task_title_0, R.id.task_title_1, R.id.task_title_2, R.id.task_title_3 };

    /** Below this height the streak footer is dropped so the cards keep room. */
    private static final int FOOTER_MIN_HEIGHT_DP = 130;

    @Override
    RemoteViews render(Context ctx, WidgetState s, Bundle options) {
        Context lc = WidgetUpdater.localized(ctx, s);
        boolean rtl = WidgetUpdater.isRtl(lc);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_tasks);
        WidgetUpdater.applyCommon(ctx, v, rtl);

        v.setTextViewText(R.id.tasks_title, lc.getString(R.string.widget_tasks_title));

        boolean active = s.mode == WidgetState.Mode.ACTIVE;
        v.setViewVisibility(R.id.tasks_grid, active ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.tasks_message, active ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.tasks_progress, active ? View.VISIBLE : View.INVISIBLE);
        v.setViewVisibility(R.id.tasks_day, active ? View.VISIBLE : View.GONE);

        if (!active) {
            v.setTextViewText(R.id.tasks_message, lc.getString(
                    s.mode == WidgetState.Mode.SIGNED_OUT ? R.string.widget_sign_in : R.string.widget_stale));
            v.setViewVisibility(R.id.tasks_footer, View.GONE);
            return v;
        }

        int done = s.doneCount();
        int total = s.tasks.size();
        v.setTextViewText(R.id.tasks_day, lc.getString(R.string.widget_day_of,
                String.valueOf(s.day), String.valueOf(s.totalDays)));
        v.setTextViewText(R.id.tasks_count, lc.getString(R.string.widget_done_of,
                String.valueOf(done), String.valueOf(total)));
        v.setImageViewBitmap(R.id.tasks_bar,
                WidgetGraphics.bar(ctx, 96, 6, total > 0 ? (float) done / total : 0f, rtl));

        List<WidgetState.Task> shown = pickFour(s.tasks);
        for (int i = 0; i < CARDS.length; i++) {
            if (i >= shown.size()) {
                v.setViewVisibility(CARDS[i], View.INVISIBLE);
                continue;
            }
            WidgetState.Task t = shown.get(i);
            v.setViewVisibility(CARDS[i], View.VISIBLE);
            v.setImageViewResource(CHECKS[i], t.done ? R.drawable.widget_check_done : R.drawable.widget_check_pending);
            v.setTextViewText(TITLES[i], t.title);
            v.setTextColor(TITLES[i], ctx.getColor(t.done ? R.color.widget_muted : R.color.widget_text));
        }

        int height = WidgetUpdater.heightDp(options);
        boolean roomForFooter = height == 0 || height >= FOOTER_MIN_HEIGHT_DP;
        v.setViewVisibility(R.id.tasks_footer, roomForFooter ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.tasks_streak, streakLine(lc, s));
        return v;
    }

    /**
     * Stages have 5–9 tasks and the grid holds four, so unfinished tasks get
     * the slots first — the widget should show what's left to do. Chosen tasks
     * keep their order from the app.
     */
    private static List<WidgetState.Task> pickFour(List<WidgetState.Task> tasks) {
        List<WidgetState.Task> picked = new ArrayList<>(4);
        int pending = 0;
        for (WidgetState.Task t : tasks) if (!t.done) pending++;
        int doneSlots = Math.max(0, 4 - pending);
        for (WidgetState.Task t : tasks) {
            if (picked.size() == 4) break;
            if (!t.done) picked.add(t);
            else if (doneSlots > 0) {
                picked.add(t);
                doneSlots--;
            }
        }
        return picked;
    }

    /** "سلسلة 5 أيام — تبقّت مهمتان للحفاظ عليها" and its variants. */
    private static String streakLine(Context lc, WidgetState s) {
        int left = s.remaining();
        String sep = lc.getString(R.string.widget_separator);
        if (s.streak <= 0) {
            if (s.dayCompleted) return lc.getString(R.string.widget_day_complete);
            return left > 0
                    ? WidgetUpdater.plural(lc, R.plurals.widget_start_tasks_left, left)
                    : lc.getString(R.string.widget_finish_to_start);
        }
        String prefix = WidgetUpdater.plural(lc, R.plurals.widget_streak_prefix, s.streak);
        if (s.dayCompleted) return prefix + sep + lc.getString(R.string.widget_streak_day_done);
        return prefix + sep + (left > 0
                ? WidgetUpdater.plural(lc, R.plurals.widget_keep_tasks_left, left)
                : lc.getString(R.string.widget_finish_to_keep));
    }
}
