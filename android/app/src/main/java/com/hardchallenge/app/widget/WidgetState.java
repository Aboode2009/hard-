package com.hardchallenge.app.widget;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * What the widgets show: the JSON snapshot the web app writes (see
 * src/lib/widget-sync.ts), read against today's date in Baghdad.
 *
 * Snapshot fields: signedIn, lang ("ar"|"en"), date (Baghdad YYYY-MM-DD it was
 * taken on), day, totalDays, streak, startDate (YYYY-MM-DD), completedDays
 * (challenge day numbers), dayCompleted, tasks [{title, done}].
 *
 * When the day has turned over since the snapshot, the state is rolled forward
 * only if the outcome is certain — yesterday was completed, so today is simply
 * the next day with nothing ticked. A missed day may be covered by a streak
 * freeze or may reset the challenge, and only the app knows which, so that
 * case asks the user to open the app instead of guessing.
 */
final class WidgetState {
    static final String PREFS = "hard21_widget";
    static final String KEY_SNAPSHOT = "snapshot";

    private static final String TAG = "HardWidget";

    enum Mode { SIGNED_OUT, STALE, ACTIVE }

    static final int WEEK_IDLE = 0;
    static final int WEEK_DONE = 1;
    static final int WEEK_TODAY = 2;

    static final class Task {
        final String title;
        final boolean done;

        Task(String title, boolean done) {
            this.title = title;
            this.done = done;
        }
    }

    final Mode mode;
    /** The app's language, "ar" or "en"; null when no snapshot exists yet. */
    final String lang;
    final int day;
    final int totalDays;
    final int streak;
    final boolean dayCompleted;
    final List<Task> tasks;
    /** Saturday-first: WEEK_IDLE / WEEK_DONE / WEEK_TODAY. */
    final int[] week;

    private WidgetState(Mode mode, String lang, int day, int totalDays, int streak,
                        boolean dayCompleted, List<Task> tasks, int[] week) {
        this.mode = mode;
        this.lang = lang;
        this.day = day;
        this.totalDays = totalDays;
        this.streak = streak;
        this.dayCompleted = dayCompleted;
        this.tasks = tasks;
        this.week = week;
    }

    private static WidgetState inactive(Mode mode, String lang) {
        return new WidgetState(mode, lang, 0, 0, 0, false,
                Collections.<Task>emptyList(), new int[7]);
    }

    int doneCount() {
        int n = 0;
        for (Task t : tasks) if (t.done) n++;
        return n;
    }

    int remaining() {
        return tasks.size() - doneCount();
    }

    static void save(Context ctx, String json) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_SNAPSHOT, json)
                .apply();
    }

    static WidgetState load(Context ctx) {
        String json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_SNAPSHOT, null);
        return from(json, System.currentTimeMillis());
    }

    static WidgetState from(String json, long nowMs) {
        // Never opened since install: nobody has signed in on this device yet.
        if (json == null) return inactive(Mode.SIGNED_OUT, null);

        String lang = null;
        try {
            JSONObject o = new JSONObject(json);
            lang = "ar".equals(o.optString("lang")) ? "ar" : "en";
            if (!o.optBoolean("signedIn", false)) return inactive(Mode.SIGNED_OUT, lang);

            long today = WidgetDates.baghdadToday(nowMs);
            long snapshotDay = WidgetDates.parse(o.getString("date"));
            long start = WidgetDates.parse(o.getString("startDate"));
            int totalDays = o.getInt("totalDays");
            int streak = o.getInt("streak");
            int day = o.getInt("day");
            boolean dayCompleted = o.optBoolean("dayCompleted", false);

            Set<Integer> completed = new HashSet<>();
            JSONArray days = o.optJSONArray("completedDays");
            if (days != null) {
                for (int i = 0; i < days.length(); i++) completed.add(days.getInt(i));
            }

            JSONArray list = o.getJSONArray("tasks");
            List<Task> tasks = new ArrayList<>(list.length());
            for (int i = 0; i < list.length(); i++) {
                JSONObject t = list.getJSONObject(i);
                tasks.add(new Task(t.getString("title"), t.optBoolean("done", false)));
            }

            if (today > snapshotDay) {
                int newDay = (int) (today - start + 1);
                boolean noGaps = true;
                for (int d = 1; d < newDay; d++) {
                    if (!completed.contains(d)) {
                        noGaps = false;
                        break;
                    }
                }
                if (!noGaps || newDay > totalDays) return inactive(Mode.STALE, lang);

                day = newDay;
                dayCompleted = false;
                List<Task> fresh = new ArrayList<>(tasks.size());
                for (Task t : tasks) fresh.add(new Task(t.title, false));
                tasks = fresh;
            }

            return new WidgetState(Mode.ACTIVE, lang, day, totalDays, streak, dayCompleted,
                    tasks, week(today, start, completed));
        } catch (Exception e) {
            Log.w(TAG, "Unreadable widget snapshot", e);
            return inactive(Mode.STALE, lang);
        }
    }

    private static int[] week(long today, long start, Set<Integer> completed) {
        int[] week = new int[7];
        long saturday = today - WidgetDates.saturdayIndex(today);
        for (int i = 0; i < 7; i++) {
            long date = saturday + i;
            int challengeDay = (int) (date - start + 1);
            if (challengeDay >= 1 && completed.contains(challengeDay)) week[i] = WEEK_DONE;
            else if (date == today) week[i] = WEEK_TODAY;
            else week[i] = WEEK_IDLE;
        }
        return week;
    }
}
