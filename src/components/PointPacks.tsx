import { AlertCircle, RotateCcw } from "lucide-react";
import { bi } from "@/i18n/bi";
import { useCheckout } from "@/hooks/useCheckout";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { IQD_PER_PACK, UNITS_PER_PACK } from "@/lib/premium";
import { useStorePrices } from "@/hooks/useStorePrices";

const ACCENT = "#FFC800";
/** The currency's own colour, for the gem tile. */
const GEM = "#1CB0F6";

/**
 * Purchasable bundles. `packs` is what the Edge Function is told; the point
 * count and price shown are derived from it so the two can never drift apart.
 */
const PACK_OPTIONS = [1, 5, 10];

/**
 * "Buy points" bundles, shared by the Store and Points pages.
 *
 * Points are credited to `challenge_progress.total_points` on the server —
 * by the WAYL webhook on Android, by the apple-iap function after an App Store
 * purchase on iOS. There is one currency in the app and this tops up that
 * same balance.
 */
export const PointPacks = ({ className = "" }: { className?: string }) => {
  const { start, retry, pending, error } = useCheckout();
  // iOS: App Store prices in the buyer's currency instead of dinars.
  const store = useStorePrices();

  return (
    <section className={className}>
      <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
        {bi("شراء النقاط", "Buy Points")}
      </h2>
      <div className="h-0.5 mt-3 mb-4 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

      {!store && (
        <p className="mb-4 text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
          {bi(
            `كل ${UNITS_PER_PACK} نقطة بـ ${IQD_PER_PACK.toLocaleString("en-US")} دينار.`,
            `${UNITS_PER_PACK} points for ${IQD_PER_PACK.toLocaleString("en-US")} IQD.`,
          )}
        </p>
      )}

      {error && (
        <div
          className="mb-4 flex items-start gap-2.5 rounded-xl border p-3"
          style={{ borderColor: "#FF4B4B55", background: "#FF4B4B12" }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#FF4B4B" }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-text))" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold"
              style={{ color: "#1CB0F6" }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {bi("إعادة المحاولة", "Try again")}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {PACK_OPTIONS.map((packs) => {
          const points = packs * UNITS_PER_PACK;
          const price = packs * IQD_PER_PACK;
          const busy = pending === `coins:${packs}`;

          return (
            <button
              key={packs}
              type="button"
              // Called straight from the click with nothing awaited first, so
              // the web popup opens inside the user gesture.
              onClick={() => start("coins", packs)}
              disabled={pending !== null}
              className="duo-card duo-press flex w-full items-center justify-between px-4 py-3.5 disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${GEM}1e` }}
                  aria-hidden="true"
                >
                  <DuoGem className="h-6 w-6" />
                </div>
                <span className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                  {points.toLocaleString("en-US")} {bi("نقطة", "points")}
                </span>
              </div>

              <span
                className="text-sm font-extrabold"
                style={{ color: busy ? "hsl(var(--duo-muted))" : ACCENT }}
              >
                {busy
                  ? store
                    ? bi("جارٍ الشراء…", "Purchasing…")
                    : bi("جارٍ فتح صفحة الدفع…", "Opening payment…")
                  : store
                    ? (store.coins[packs] ?? "…")
                    : bi(
                        `${price.toLocaleString("en-US")} د.ع`,
                        `${price.toLocaleString("en-US")} IQD`,
                      )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
        {store
          ? bi("يتم الدفع عبر App Store", "Payment through the App Store")
          : bi("يتم الدفع عبر WAYL", "Payments handled by WAYL")}
      </p>
    </section>
  );
};
