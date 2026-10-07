import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Crown, RotateCcw } from "lucide-react";
import { bi } from "@/i18n/bi";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useCompanyAccess } from "@/hooks/useCompanyAccess";
import { useSessionUserId } from "@/lib/session-user";
import { clearCompanyMode, readCompanyMode, saveCompanyMode } from "@/lib/company-mode";

const DENIED_TITLE = () => bi("وضع الشركة للمشتركين فقط", "Company mode is for subscribers");
const DENIED_BODY = () =>
  bi(
    "تسجيل الحضور ولوحة متصدّري الشركة ومتجرها متاحة للمشتركين المرتبطين بشركة. اشترك لتفعيلها، أو تابع تحدّيك الشخصي كالمعتاد.",
    "Attendance, the company leaderboard and its store are available to subscribers linked to a company. Subscribe to turn them on, or carry on with your personal challenge.",
  );

/**
 * Wraps every company-mode screen.
 *
 * Company mode is premium-only, and the database enforces that independently —
 * this exists so a user who lost access gets an explanation and a way forward
 * instead of a screen full of failed requests.
 *
 * Two paths:
 * - The user is remembered on this device as a company user
 *   (lib/company-mode.ts): the screen renders at once and the server is asked
 *   in the background. If it says no, the flag is cleared, the subscription
 *   warning is shown and the user is taken back to the main challenge.
 * - Anyone else: children render only once the server has confirmed access,
 *   and a refusal shows the explanation screen below.
 */
export const CompanyAccessGate = ({ children }: { children: ReactNode }) => {
  const uid = useSessionUserId();
  // Captured once per mount: clearing the flag mid-way must not flip this
  // screen into the fail-closed path and flash the explanation screen.
  const wasFlagged = useRef(readCompanyMode(uid) !== null);
  const { state, serverDenied, recheck } = useCompanyAccess(uid, wasFlagged.current);
  const navigate = useNavigate();
  const { toast } = useToast();
  useTranslation(); // keeps bi() reactive on language change

  // Remember a confirmed company user so the next launch opens here directly.
  useEffect(() => {
    if (!uid || state !== "allowed" || serverDenied) return;
    if (!readCompanyMode(uid)) saveCompanyMode(uid, "NASS");
  }, [uid, state, serverDenied]);

  // A remembered company user who lost access: forget it and go back quietly.
  const evicted = wasFlagged.current && serverDenied;
  useEffect(() => {
    if (!evicted || !uid) return;
    clearCompanyMode(uid);
    toast({
      variant: "destructive",
      title: DENIED_TITLE(),
      description: DENIED_BODY(),
      action: (
        <ToastAction altText={bi("اشترك الآن", "Subscribe now")} onClick={() => navigate("/premium")}>
          {bi("اشترك الآن", "Subscribe now")}
        </ToastAction>
      ),
    });
    navigate("/", { replace: true });
  }, [evicted, uid, navigate, toast]);

  if (evicted) return null;

  if (state === "checking") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6">
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-muted border-t-primary"
          role="status"
          aria-label={bi("جارٍ التحقق", "Checking")}
        />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">
            <Building2 className="h-9 w-9 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        <div className="max-w-sm space-y-2">
          <h1 className="text-xl font-extrabold text-foreground">{DENIED_TITLE()}</h1>
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">{DENIED_BODY()}</p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            onClick={() => navigate("/premium")}
            className="h-12 rounded-2xl text-base font-extrabold"
          >
            <Crown className="h-4 w-4" />
            {bi("اشترك الآن", "Subscribe now")}
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/", { replace: true })}
            className="h-12 rounded-2xl text-base font-bold"
          >
            {bi("العودة للتحدي الرئيسي", "Back to the main challenge")}
          </Button>

          <button
            type="button"
            onClick={recheck}
            className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {bi("أعد المحاولة", "Try again")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
