package com.hardchallenge.app.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;

import com.hardchallenge.app.R;

/**
 * Shapes RemoteViews can't draw: the progress ring and the rounded progress
 * bar are painted into bitmaps here and handed over with setImageViewBitmap.
 */
final class WidgetGraphics {
    private WidgetGraphics() {}

    private static int px(Context ctx, float dp) {
        return Math.max(1, Math.round(dp * ctx.getResources().getDisplayMetrics().density));
    }

    private static float clamp(float v) {
        return Math.max(0f, Math.min(1f, v));
    }

    /**
     * Circular progress, filling clockwise from 12 o'clock with a round cap —
     * widget-1: r=50, stroke 10 (≈9% of the outer diameter).
     */
    static Bitmap ring(Context ctx, float sizeDp, float progress) {
        int size = px(ctx, sizeDp);
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        float stroke = size * 0.09f;
        float inset = stroke / 2f;
        RectF oval = new RectF(inset, inset, size - inset, size - inset);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(stroke);
        paint.setColor(ctx.getColor(R.color.widget_border));
        canvas.drawOval(oval, paint);

        float p = clamp(progress);
        if (p > 0f) {
            paint.setColor(ctx.getColor(R.color.widget_pink));
            paint.setStrokeCap(Paint.Cap.ROUND);
            canvas.drawArc(oval, -90f, 360f * p, false, paint);
        }
        return bmp;
    }

    /**
     * Pill-shaped bar filling from the reading start — the right edge in
     * Arabic, the left in English (widget-2 fills from the right).
     */
    static Bitmap bar(Context ctx, float widthDp, float heightDp, float progress, boolean rtl) {
        int w = px(ctx, widthDp);
        int h = px(ctx, heightDp);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        float r = h / 2f;

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(ctx.getColor(R.color.widget_border));
        canvas.drawRoundRect(new RectF(0, 0, w, h), r, r, paint);

        float p = clamp(progress);
        if (p > 0f) {
            // Never narrower than its own height, so a small value still reads as a pill.
            float fill = Math.max(h, w * p);
            RectF rect = rtl ? new RectF(w - fill, 0, w, h) : new RectF(0, 0, fill, h);
            paint.setColor(ctx.getColor(R.color.widget_pink));
            canvas.drawRoundRect(rect, r, r, paint);
        }
        return bmp;
    }
}
