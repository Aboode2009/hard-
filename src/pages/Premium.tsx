import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Check, Ban, ListChecks, Route as RouteIcon, AlertCircle, RotateCcw, Infinity as InfinityIcon } from "lucide-react";
import { bi } from "@/i18n/bi";
import { usePremium } from "@/hooks/usePremium";
import { LIFETIME_PRICE_IQD, PREMIUM_PRICE_IQD, formatPremiumExpiry, refreshEntitlements } from "@/lib/premium";
import { useCheckout } from "@/hooks/useCheckout";
import { useStorePrices } from "@/hooks/useStorePrices";
import { isAppleStore, manageAppleSubscription, restoreApplePurchases } from "@/lib/apple-iap";
import { PUBLIC_WEB_URL } from "@/config/auth";

/** Apple's standard licence agreement, which App Store apps may use as their terms. */
const APPLE_EULA_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = `${PUBLIC_WEB_URL}/privacy.html`;

const openLink = (url: string) => {
  if (Capacitor.isNativePlatform()) void Browser.open({ url });
  else window.open(url, "_blank", "noopener");
};

const ACCENT = "#FFC800";
const GREEN = "#58CC02";

type Plan = "premium" | "lifetime";

/** One selectable plan card. Lifetime carries the "best value" ribbon. */
const PlanOption = ({
  selected,
  onSelect,
  title,
  price,
  unit,
  note,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  /** Already formatted: dinars on Android, the App Store's own string on iOS. */
  price: string;
  unit: string;
  note?: string;
  badge?: string;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className="duo-card duo-press relative w-full px-4 py-4 text-start"
    style={{
      borderColor: selected ? ACCENT : undefined,
      borderWidth: selected ? 2 : undefined,
      background: selected ? `${ACCENT}14` : undefined,
    }}
  >
    {badge && (
      <span
        className="absolute -top-3 start-4 rounded-full px-3 py-0.5 text-xs font-extrabold text-white"
        style={{ background: GREEN }}
      >
        {badge}
      </span>
    )}
    <div className="flex items-center gap-3">
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2"
        style={{
          borderColor: selected ? ACCENT : "hsl(var(--duo-border))",
          background: selected ? ACCENT : "transparent",
        }}
        aria-hidden="true"
      >
        {selected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={4} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{title}</p>
        {note && (
          <p className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>{note}</p>
        )}
      </div>
      <div className="text-end">
        <span className="text-xl font-extrabold" style={{ color: ACCENT }}>
          {price}
        </span>
        <span className="ms-1 text-xs font-bold" style={{ color: "hsl(var(--duo-muted))" }}>{unit}</span>
      </div>
    </div>
  </button>
);

const BENEFITS = [
  {
    icon: Ban,
    ar: "بدون إعلانات",
    en: "No ads",
    arDesc: "لن يظهر لك أي إعلان داخل التطبيق.",
    enDesc: "No ads anywhere in the app.",
  },
  {
    icon: ListChecks,
    ar: "مهام خاصة",
    en: "Custom tasks",
    arDesc: "أنشئ مهامك الخاصة بأسمائها وأوقاتها.",
    enDesc: "Create your own tasks, your way.",
  },
  {
    icon: RouteIcon,
    ar: "فتح كل المسارات",
    en: "All paths unlocked",
    arDesc: "تابع إلى ما بعد المسار الأول بلا حدود.",
    enDesc: "Continue past the first path without limits.",
  },
];

const Premium = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { isPremium, isLifetime, details, loading } = usePremium();
  const { start, retry, pending, error, errorReason } = useCheckout();
  const starting = pending !== null;
  // Lifetime is pre-selected: it's the plan the page recommends.
  const [plan, setPlan] = useState<Plan>("lifetime");
  // An active monthly subscriber can only upgrade; offering monthly again
  // would just stack another month on the same account.
  const selectedPlan: Plan = isPremium ? "lifetime" : plan;

  const expiry = formatPremiumExpiry(details, i18n.language, bi("مدى الحياة", "Lifetime"));

  // iOS sells through the App Store, at the App Store's prices.
  const store = useStorePrices();
  const monthlyPrice = store ? (store.premium ?? "…") : PREMIUM_PRICE_IQD.toLocaleString("en-US");
  const lifetimePrice = store ? (store.lifetime ?? "…") : LIFETIME_PRICE_IQD.toLocaleString("en-US");

  const [restoring, setRestoring] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    setRestoreNote(null);
    try {
      const granted = await restoreApplePurchases();
      await refreshEntitlements();
      setRestoreNote(
        granted > 0
          ? bi("تم استرجاع مشترياتك.", "Your purchases were restored.")
          : bi("ماكو مشتريات جديدة للاسترجاع على هذا الحساب.", "Nothing new to restore for this account."),
      );
    } catch (err) {
      console.error("Restore failed:", err);
      setRestoreNote(bi("تعذّر الاسترجاع. حاول مرة أخرى.", "Couldn't restore. Please try again."));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="duo-page min-h-screen bg-background pb-10" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
            aria-label={bi("رجوع", "Back")}
          >
            {isRTL
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("بريميوم", "Premium")}
          </h1>
          <div className="w-11" />
        </div>

        {/* Hero */}
        <div className="duo-card px-5 py-6 text-center">
          <div className="text-5xl leading-none mb-3" role="img" aria-hidden="true">👑</div>
          <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("Hard 21 بريميوم", "Hard 21 Premium")}
          </h2>
          <p className="mt-2 text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
            {bi(
              "افتح التطبيق بالكامل وادعم استمراره.",
              "Unlock the whole app and support its development.",
            )}
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-4 space-y-3">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.en} className="duo-card flex items-center gap-3 px-4 py-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${ACCENT}1e` }}
                >
                  <Icon className="w-5 h-5" style={{ color: ACCENT }} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                    {bi(benefit.ar, benefit.en)}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                    {bi(benefit.arDesc, benefit.enDesc)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Plans + action */}
        <div className="mt-6">
          {loading ? (
            <div className="h-14 rounded-2xl animate-pulse" style={{ background: "hsl(var(--duo-border))" }} />
          ) : isLifetime ? (
            <div
              className="duo-card flex w-full flex-col items-center justify-center gap-1 px-4 py-4 text-center"
              style={{ borderColor: ACCENT, borderWidth: 2 }}
            >
              <span className="flex items-center gap-2 text-base font-extrabold" style={{ color: ACCENT }}>
                <InfinityIcon className="h-5 w-5" strokeWidth={3} />
                {bi("مشترك مدى الحياة", "Lifetime member")}
              </span>
              <span className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                {bi("كل الميزات مفتوحة لك للأبد.", "Every feature, unlocked for good.")}
              </span>
            </div>
          ) : (
            <>
              {isPremium && (
                <div
                  className="duo-card mb-5 flex w-full flex-col items-center justify-center gap-0.5 px-4 py-3.5 text-center"
                  style={{ color: GREEN }}
                >
                  <span className="flex items-center gap-2 text-base font-extrabold">
                    <Check className="h-5 w-5" strokeWidth={3} />
                    {bi("اشتراكك فعّال", "Your subscription is active")}
                  </span>
                  {expiry && (
                    <span className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                      {bi(`حتى ${expiry}`, `Until ${expiry}`)}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-4 pt-1" role="radiogroup" aria-label={bi("اختر خطة", "Choose a plan")}>
                {!isPremium && (
                  <PlanOption
                    selected={selectedPlan === "premium"}
                    onSelect={() => setPlan("premium")}
                    title={bi("شهري", "Monthly")}
                    price={monthlyPrice}
                    unit={store ? bi("/ شهرياً", "/ month") : bi("دينار / شهرياً", "IQD / month")}
                  />
                )}
                <PlanOption
                  selected={selectedPlan === "lifetime"}
                  onSelect={() => setPlan("lifetime")}
                  title={bi("مدى الحياة", "Lifetime")}
                  price={lifetimePrice}
                  unit={store ? "" : bi("دينار", "IQD")}
                  note={bi("دفعة واحدة — بلا تجديد", "One payment — never renews")}
                  badge={bi("أفضل قيمة", "Best value")}
                />
              </div>

              <button
                type="button"
                // Called straight from the click so the web popup opens inside
                // the user gesture; on mobile it opens the in-app payment page.
                onClick={() => start(selectedPlan)}
                disabled={starting}
                className="duo-press mt-5 h-14 w-full rounded-2xl text-base font-extrabold text-white disabled:opacity-60"
                style={{ background: ACCENT, boxShadow: "0 4px 0 #D9A800" }}
              >
                {starting
                  ? isAppleStore
                    ? bi("جارٍ الشراء…", "Purchasing…")
                    : bi("جارٍ فتح صفحة الدفع…", "Opening payment…")
                  : selectedPlan === "lifetime"
                    ? isPremium
                      ? bi("الترقية إلى مدى الحياة", "Upgrade to lifetime")
                      : bi("اشترِ مدى الحياة", "Buy lifetime")
                    : bi("اشترك شهرياً", "Subscribe monthly")}
              </button>
            </>
          )}

          {/* Quiet secondary line, directly under the button. */}
          <p className="mt-2.5 text-center text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
            {isAppleStore
              ? bi("يتم الدفع عبر App Store", "Payment through the App Store")
              : bi("يتم الدفع عبر WAYL", "Payments handled by WAYL")}
          </p>

          {isAppleStore && (
            // What App Review requires around an auto-renewing subscription:
            // the renewal terms, Terms of Use and Privacy Policy links, a way
            // to restore purchases, and to manage the subscription.
            <div className="mt-4 space-y-3 text-center">
              <p className="text-[11px] font-semibold leading-relaxed" style={{ color: "hsl(var(--duo-muted))" }}>
                {bi(
                  "الاشتراك الشهري يتجدد تلقائياً بنفس السعر كل شهر، إلا إذا ألغيته قبل 24 ساعة على الأقل من نهاية الفترة الحالية. المبلغ ينخصم من حساب Apple ID عند تأكيد الشراء، وتگدر تدير الاشتراك أو تلغيه من إعدادات حسابك في App Store. مدى الحياة دفعة وحدة ما تتجدد.",
                  "The monthly plan renews automatically at the same price each month unless cancelled at least 24 hours before the end of the current period. Payment is charged to your Apple ID at confirmation; manage or cancel it in your App Store account settings. Lifetime is a single payment that never renews.",
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-extrabold" style={{ color: "#1CB0F6" }}>
                <button type="button" onClick={() => openLink(APPLE_EULA_URL)}>
                  {bi("شروط الاستخدام", "Terms of Use")}
                </button>
                <button type="button" onClick={() => openLink(PRIVACY_URL)}>
                  {bi("سياسة الخصوصية", "Privacy Policy")}
                </button>
                <button type="button" onClick={restore} disabled={restoring}>
                  {restoring ? bi("جارٍ الاسترجاع…", "Restoring…") : bi("استرجاع المشتريات", "Restore purchases")}
                </button>
                {isPremium && !isLifetime && (
                  <button type="button" onClick={() => void manageAppleSubscription()}>
                    {bi("إدارة الاشتراك", "Manage subscription")}
                  </button>
                )}
              </div>
              {restoreNote && (
                <p className="text-xs font-semibold" style={{ color: "hsl(var(--duo-text))" }} role="status">
                  {restoreNote}
                </p>
              )}
            </div>
          )}

          {error && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-xl border p-3"
              style={{ borderColor: "#FF4B4B55", background: "#FF4B4B12" }}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#FF4B4B" }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-text))" }}>
                  {error}
                </p>
                {/* Retrying a lifetime purchase the server already refused
                    would only get the same 409. */}
                {errorReason !== "already_lifetime" && (
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold"
                    style={{ color: "#1CB0F6" }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {bi("إعادة المحاولة", "Try again")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Premium;
