package com.hardchallenge.app.widget;

import java.util.Calendar;
import java.util.TimeZone;

/**
 * Calendar days in Baghdad, as epoch-day numbers.
 *
 * Asia/Baghdad is UTC+3 all year with no daylight saving, so a fixed offset is
 * exact and matches baghdadDay() in src/lib/home-cache.ts — the widgets must
 * roll over at the same moment the app does, whatever the device's timezone.
 */
final class WidgetDates {
    private static final long DAY_MS = 86_400_000L;
    private static final long BAGHDAD_OFFSET_MS = 3L * 60 * 60 * 1000;

    private WidgetDates() {}

    /** Today's date in Baghdad, as days since 1970-01-01. */
    static long baghdadToday(long nowMs) {
        return floorDiv(nowMs + BAGHDAD_OFFSET_MS, DAY_MS);
    }

    /** The UTC instant of the next midnight in Baghdad. */
    static long nextBaghdadMidnightMs(long nowMs) {
        return (baghdadToday(nowMs) + 1) * DAY_MS - BAGHDAD_OFFSET_MS;
    }

    /** "YYYY-MM-DD" → days since 1970-01-01. Throws on anything else. */
    static long parse(String ymd) {
        String[] parts = ymd.split("-");
        if (parts.length != 3) throw new IllegalArgumentException("Bad date: " + ymd);
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        c.clear();
        c.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]));
        return floorDiv(c.getTimeInMillis(), DAY_MS);
    }

    /** Position in a Saturday-first week: Saturday = 0 … Friday = 6. */
    static int saturdayIndex(long epochDay) {
        // 1970-01-01 was a Thursday, which is index 5 counting from Saturday.
        return (int) floorMod(epochDay + 5, 7);
    }

    // Math.floorDiv/floorMod need API 24; minSdk is 23.
    private static long floorDiv(long a, long b) {
        long q = a / b;
        if ((a % b != 0) && ((a ^ b) < 0)) q--;
        return q;
    }

    private static long floorMod(long a, long b) {
        return a - floorDiv(a, b) * b;
    }
}
