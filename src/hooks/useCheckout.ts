import { useCallback, useState } from "react";
import { bi } from "@/i18n/bi";
import {
  CheckoutError,
  refreshEntitlements,
  startCheckout,
  type PaymentKind,
} from "@/lib/premium";

/** Human-readable Arabic/English text for each failure mode. */
const MESSAGES: Record<string, { ar: string; en: string }> = {
  auth: {
    ar: "تعذّر التحقّق من حسابك. سجّل الخروج ثم الدخول وحاول مجدداً.",
    en: "We couldn't verify your account. Sign out, sign back in and try again.",
  },
  network: {
    ar: "تعذّر الاتصال بالإنترنت. تأكد من اتصالك وحاول مرة أخرى.",
    en: "No connection. Check your internet and try again.",
  },
  server: {
    ar: "تعذّر إنشاء صفحة الدفع الآن. حاول بعد قليل.",
    en: "Couldn't create the payment page right now. Please try again shortly.",
  },
  launch: {
    ar: "تعذّر فتح صفحة الدفع. حاول مرة أخرى.",
    en: "Couldn't open the payment page. Please try again.",
  },
  already_lifetime: {
    ar: "أنت مشترك مدى الحياة مسبقاً",
    en: "You already have a lifetime subscription.",
  },
  // App Store (iOS)
  pending: {
    ar: "الشراء بانتظار الموافقة. راح يتفعّل أول ما ينوافق عليه.",
    en: "The purchase is waiting for approval. It will activate once approved.",
  },
  unavailable: {
    ar: "هذا المنتج غير متوفر حالياً في App Store.",
    en: "This item isn't available in the App Store right now.",
  },
  other_account: {
    ar: "هذا الشراء مربوط بحساب Hard 21 ثاني. سجّل دخول بذاك الحساب.",
    en: "This purchase belongs to another Hard 21 account. Sign in with that account.",
  },
  undelivered: {
    ar: "تم الدفع، وراح يتفعّل خلال لحظات تلقائياً. إذا تأخر، افتح التطبيق من جديد.",
    en: "Payment received. It will activate automatically in a moment — reopen the app if it doesn't.",
  },
};

/**
 * Drives one checkout button: start, in-flight state, and a specific error
 * with a retry.
 *
 * `start` must be called straight from the click handler with nothing awaited
 * before it — `startCheckout` opens the web popup synchronously inside the
 * user gesture, and an `await` in between gets it blocked.
 */
export function useCheckout() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Why the last attempt failed; lets the UI skip "retry" when it's pointless. */
  const [errorReason, setErrorReason] = useState<string | null>(null);
  /** Remembered so the retry button can repeat the exact same request. */
  const [lastArgs, setLastArgs] = useState<{ kind: PaymentKind; packs?: number } | null>(null);

  const start = useCallback((kind: PaymentKind, packs?: number) => {
    if (pending) return;

    const key = kind === "coins" ? `coins:${packs}` : kind;
    setPending(key);
    setError(null);
    setErrorReason(null);
    setLastArgs({ kind, packs });

    startCheckout(kind, packs)
      .catch((err) => {
        console.error("Checkout failed:", err);
        const reason = err instanceof CheckoutError ? err.reason : "server";
        // Closing Apple's purchase sheet is a choice, not an error.
        if (reason === "cancelled") return;
        const msg = MESSAGES[reason] ?? MESSAGES.server;
        setError(bi(msg.ar, msg.en));
        setErrorReason(reason);
        // The server knows about a lifetime purchase this screen didn't —
        // re-read so the buy buttons give way to the lifetime badge.
        if (reason === "already_lifetime") void refreshEntitlements();
      })
      .finally(() => setPending(null));
  }, [pending]);

  const retry = useCallback(() => {
    if (!lastArgs) return;
    start(lastArgs.kind, lastArgs.packs);
  }, [lastArgs, start]);

  const clearError = useCallback(() => {
    setError(null);
    setErrorReason(null);
  }, []);

  return { start, retry, clearError, pending, error, errorReason };
}
