import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { onPaymentConfirmed, refreshEntitlements } from "@/lib/premium";
import { deliverAppleTransactions, isAppleStore, listenForAppleTransactions } from "@/lib/apple-iap";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { bi } from "@/i18n/bi";

/**
 * Re-reads premium status and the coin balance whenever the user comes back
 * from the WAYL checkout page.
 *
 * Purchases are activated by a server-side webhook, so the only thing the app
 * has to do is notice that something changed. Mounted once at the app root;
 * renders nothing.
 */
export const EntitlementsRefresher = () => {
  // A purchase the server has just activated (the WAYL page closes itself —
  // see watchCheckout in lib/premium.ts): say so, wherever the user is.
  useEffect(
    () =>
      onPaymentConfirmed(({ kind, points }) => {
        haptic("heavy");
        toast(
          kind === "coins"
            ? {
                title: bi("تم الدفع بنجاح", "Payment successful"),
                description: bi(`انضافت ${points ?? ""} نقطة لرصيدك.`, `${points ?? ""} points were added to your balance.`),
              }
            : kind === "lifetime"
              ? {
                  title: bi("صار اشتراكك مدى الحياة", "You're Premium for life"),
                  description: bi("كل الميزات مفتوحة إلك للأبد.", "Every feature is unlocked for good."),
                }
              : {
                  title: bi("تم تفعيل اشتراك بريميوم", "Premium is active"),
                  description: bi("أهلاً بك! كل الميزات صارت مفتوحة.", "Welcome! Every feature is now unlocked."),
                },
        );
      }),
    [],
  );

  // iOS: App Store purchases the server hasn't confirmed yet (paid offline,
  // app closed mid-purchase) go out now, and renewals that StoreKit reports
  // while the app runs are passed on as they come.
  useEffect(() => {
    if (!isAppleStore) return;
    const settle = () =>
      void deliverAppleTransactions().then((results) => {
        if (results.some((r) => r.result === "granted" || r.result === "revoked")) void refreshEntitlements();
      });
    settle();
    const resume = CapApp.addListener("resume", settle);
    const stopListening = listenForAppleTransactions(() => void refreshEntitlements());
    return () => {
      void resume.then((h) => h.remove());
      stopListening();
    };
  }, []);

  useEffect(() => {
    // `visibilitychange` and `focus` both fire on a single return, and plain
    // alt-tabbing fires them too, so refreshes are throttled rather than run
    // on every event.
    let lastRun = 0;
    const MIN_GAP_MS = 10_000;

    const refresh = () => {
      const now = Date.now();
      if (now - lastRun < MIN_GAP_MS) return;
      lastRun = now;
      void refreshEntitlements();
    };

    if (Capacitor.isNativePlatform()) {
      // A safety net next to watchCheckout: coming back to the app for any
      // reason re-reads the account.
      const handles = [CapApp.addListener("resume", refresh)];
      return () => {
        void Promise.all(handles).then((list) =>
          list.forEach((h) => void h.remove()),
        );
      };
    }

    // Web: WAYL opens in another tab (or replaces this one), so a return shows
    // up as the document becoming visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return null;
};
