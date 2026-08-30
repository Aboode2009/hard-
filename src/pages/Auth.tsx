import { useEffect, useMemo, useState } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SignIn, SignUp, useAuth } from "@clerk/react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NativeGoogleButton } from "@/components/NativeGoogleButton";
import { isNativeApp } from "@/lib/native-oauth";
import welcomeHero from "@/assets/welcome-hero.png";

/**
 * Authentication is handled by Clerk. This page has three views driven purely
 * by the URL so deep links and the hardware back button work:
 *  - /auth                → welcome screen (brand, hero, GET STARTED / sign-in CTAs)
 *  - /auth?mode=signup    → Clerk <SignUp> (also forced by ?ref= referral links)
 *  - /auth?mode=signin    → Clerk <SignIn>
 * Behavior preserved:
 *  - referral codes (?ref=...) and company codes are stashed in localStorage so
 *    ProfileBootstrap can apply them right after the account is created;
 *  - after auth, users land on "/", where Index handles NASS redirection.
 *
 * Clerk's own header/footer are hidden (footer removes the "Secured by Clerk"
 * branding); the header and the sign-in/up toggle are rendered by this page.
 */

const MountainFlagLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    {/* back peak */}
    <path d="M4 44 L17 20 L26 37 Z" fill="hsl(var(--foreground) / 0.5)" />
    {/* front peak */}
    <path d="M13 44 L30 13 L47 44 Z" fill="hsl(var(--foreground))" />
    {/* flag pole */}
    <rect x="29" y="2" width="2.4" height="14" rx="1.2" fill="hsl(var(--foreground))" />
    {/* pennant */}
    <path d="M31.4 3 h13 l-4.2 4.5 4.2 4.5 h-13 Z" fill="hsl(var(--primary))" />
  </svg>
);

const BrandWordmark = ({ compact = false }: { compact?: boolean }) => (
  <span
    dir="ltr"
    className={`flex flex-col text-start font-black leading-none tracking-tight ${
      compact ? "text-xl" : "text-[22px]"
    }`}
  >
    <span className="text-foreground">HARD</span>
    <span className="text-primary">CHALLENGE</span>
  </span>
);

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  // Subscribe to language changes so bi() output stays reactive.
  useTranslation();

  // If already signed in, don't show the auth screen.
  useEffect(() => {
    if (isLoaded && isSignedIn) navigate("/");
  }, [isLoaded, isSignedIn, navigate]);

  // Capture referral + company code for ProfileBootstrap to consume post-signup.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("pendingReferralCode", ref);
    const company = searchParams.get("company");
    if (company) localStorage.setItem("pendingCompanyCode", company);
  }, [searchParams]);

  // Referral links skip the welcome screen straight to sign-up.
  const mode = searchParams.get("mode");
  const view: "welcome" | "signup" | "signin" =
    !!searchParams.get("ref") || mode === "signup"
      ? "signup"
      : mode === "signin"
        ? "signin"
        : "welcome";

  // The theme can't change while on /auth (Settings is behind auth), so one
  // read at mount is enough — no observer needed.
  const [isDark] = useState(() => document.documentElement.classList.contains("dark"));

  const appearance = useMemo(
    () => ({
      layout: {
        socialButtonsPlacement: "bottom" as const,
        // Removes the yellow "Development mode" badge shown by pk_test keys.
        unsafe_disableDevelopmentModeWarnings: true,
      },
      variables: {
        colorPrimary: "hsl(350 80% 60%)",
        colorText: isDark ? "hsl(0 0% 95%)" : "hsl(0 0% 15%)",
        colorTextSecondary: isDark ? "hsl(0 0% 60%)" : "hsl(0 0% 45%)",
        colorBackground: "transparent",
        colorInputBackground: isDark ? "hsl(0 0% 15%)" : "hsl(350 20% 97%)",
        colorInputText: isDark ? "hsl(0 0% 95%)" : "hsl(0 0% 15%)",
        borderRadius: "0.9rem",
        fontFamily:
          "'Baloo Bhaijaan 2', 'Nunito', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      },
      elements: {
        rootBox: "w-full",
        cardBox: "w-full shadow-none",
        card: "bg-transparent shadow-none border-0 p-0 gap-5",
        // On native we replace Clerk's social buttons + divider with our own
        // in-app-browser Google button (rendered above the form); hide Clerk's
        // versions so there aren't two. On web these stay visible as normal.
        ...(isNativeApp
          ? { socialButtons: "hidden", socialButtonsRoot: "hidden", dividerRow: "hidden" }
          : {}),
        // Hide Clerk's redundant title (we render our own brand header) but keep
        // the subtitle so multi-step instructions ("Enter the code we sent…")
        // stay visible. Hiding the footer also removes the "Secured by Clerk" row.
        headerTitle: "hidden",
        headerSubtitle: "text-muted-foreground text-sm text-center",
        footer: "hidden",
        footerAction: "hidden",
        socialButtonsBlockButton:
          "bg-muted/40 border border-border hover:bg-muted/70 text-foreground font-bold rounded-2xl h-12 transition-all duration-200 active:scale-[0.98]",
        socialButtonsBlockButtonText: "font-medium text-foreground",
        socialButtonsProviderIcon: "w-5 h-5",
        dividerLine: "bg-border",
        dividerText: "text-muted-foreground text-xs uppercase tracking-wider",
        formFieldLabel: "text-foreground/70 font-medium text-sm mb-1.5",
        formFieldInput:
          "bg-muted/40 border border-border text-foreground rounded-2xl h-12 px-4 transition-all duration-200 focus:border-primary/60 focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/60",
        formButtonPrimary:
          "bg-gradient-to-r from-primary to-[hsl(350_85%_66%)] hover:opacity-95 text-white font-extrabold rounded-2xl h-14 shadow-lg shadow-primary/30 transition-all duration-200 active:scale-[0.98] normal-case text-base tracking-wide after:hidden",
        formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
        formResendCodeLink: "text-primary hover:text-primary/80",
        identityPreview: "bg-muted/40 border border-border rounded-xl",
        identityPreviewText: "text-foreground",
        identityPreviewEditButton: "text-primary hover:text-primary/80",
        otpCodeFieldInput: "border-border text-foreground rounded-lg",
        formFieldAction: "text-primary hover:text-primary/80",
        formFieldSuccessText: "text-emerald-500",
        formFieldErrorText: "text-destructive",
        formFieldWarningText: "text-amber-500",
        alert: "bg-muted/40 border border-border rounded-xl",
        alertText: "text-foreground",
        formHeaderTitle: "text-foreground",
        formHeaderSubtitle: "text-muted-foreground",
        spinner: "text-primary",
        formFieldInputShowPasswordIcon: "text-muted-foreground",
      },
    }),
    [isDark],
  );

  const clerkProps = {
    routing: "hash" as const,
    forceRedirectUrl: "/",
    appearance,
  };

  return (
    <div
      className="duo-page relative min-h-[100dvh] w-full overflow-x-hidden bg-background text-foreground"
      dir={bi("rtl", "ltr")}
    >
      {/* Language switcher — end corner, so it never overlaps the back button */}
      <div
        className="absolute right-5 z-20 rtl:left-5 rtl:right-auto"
        style={{ top: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <LanguageSwitcher />
      </div>

      {view === "welcome" ? (
        /* ---------- Welcome view ---------- */
        <div
          className="safe-area-bottom mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 3.5rem)" }}
        >
          {/* Brand */}
          <div className="flex items-center justify-center gap-2.5 animate-fade-in-up">
            <MountainFlagLogo className="h-11 w-11" />
            <BrandWordmark />
          </div>

          {/* Hero illustration with decorative rings + warm glow (matches the form views) */}
          <div className="relative flex flex-1 items-center justify-center py-6 animate-scale-in stagger-2">
            <div className="pointer-events-none absolute h-[300px] w-[300px] rounded-full border border-foreground/10" />
            <div className="pointer-events-none absolute h-[368px] w-[368px] rounded-full border border-foreground/5" />
            {/* tiny dots riding the rings */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-[182px] -translate-y-[62px] rounded-full bg-foreground/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 translate-x-[140px] translate-y-[46px] rounded-full bg-primary/40" />
            {/* warm glow behind the rock */}
            <div
              className="pointer-events-none absolute h-44 w-44 translate-y-10 rounded-full blur-3xl"
              style={{ background: "hsl(8 85% 52% / 0.25)" }}
            />
            <img
              src={welcomeHero}
              alt=""
              draggable={false}
              className="relative max-h-[42dvh] w-full max-w-[340px] object-contain"
            />
          </div>

          {/* Copy */}
          <div className="text-center animate-fade-in-up stagger-3">
            <h1
              className="text-[28px] font-extrabold leading-snug"
              style={{ color: "hsl(var(--duo-text))" }}
            >
              {bi("تحدَّ نفسك. اصنع نسخة أفضل منك.", "Challenge yourself. Build a better you.")}
            </h1>
            <p
              className="mx-auto mt-3 max-w-xs text-[15px] font-semibold leading-relaxed"
              style={{ color: "hsl(var(--duo-muted))" }}
            >
              {bi(
                "ابنِ عادات جيدة، حافظ على الاستمرارية، وكن أفضل نسخة من نفسك.",
                "Build good habits, stay consistent, and become the best version of yourself.",
              )}
            </p>
          </div>

          {/* CTAs — Duolingo-style: solid ledge button + card-outline button */}
          <div className="mt-8 flex flex-col gap-3 pb-4 animate-fade-in-up stagger-4">
            <button
              type="button"
              className="duo-press h-14 w-full rounded-2xl text-base font-extrabold tracking-wide text-white"
              style={{ background: "hsl(350 80% 60%)", boxShadow: "0 4px 0 hsl(350 80% 45%)" }}
              onClick={() => navigate("/auth?mode=signup")}
            >
              {bi("ابدأ الآن", "GET STARTED")}
            </button>
            <button
              type="button"
              className="duo-card duo-press h-14 w-full rounded-2xl text-base font-extrabold tracking-wide text-primary"
              onClick={() => navigate("/auth?mode=signin")}
            >
              {bi("عندي حساب بالفعل", "I ALREADY HAVE AN ACCOUNT")}
            </button>
          </div>
        </div>
      ) : (
        /* ---------- Sign-in / Sign-up views ---------- */
        <div
          className="safe-area-bottom mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-8"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
        >
          {/* Back to welcome */}
          <button
            type="button"
            onClick={() => navigate("/auth")}
            aria-label={bi("رجوع", "Back")}
            className="duo-card duo-press z-10 mb-1 flex h-11 w-11 items-center justify-center self-start"
          >
            <ChevronLeft
              className="h-6 w-6 rtl:hidden"
              style={{ color: "hsl(var(--duo-text))" }}
              strokeWidth={2.5}
            />
            <ChevronRight
              className="hidden h-6 w-6 rtl:block"
              style={{ color: "hsl(var(--duo-text))" }}
              strokeWidth={2.5}
            />
          </button>

          {/* Hero with decorative rings + warm glow (per mockup) */}
          <div className="relative mx-auto flex items-center justify-center py-3 animate-scale-in">
            <div className="pointer-events-none absolute h-[290px] w-[290px] rounded-full border border-foreground/10" />
            <div className="pointer-events-none absolute h-[356px] w-[356px] rounded-full border border-foreground/5" />
            {/* tiny dots riding the rings */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-[176px] -translate-y-[60px] rounded-full bg-foreground/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 translate-x-[136px] translate-y-[40px] rounded-full bg-primary/40" />
            {/* warm glow behind the rock */}
            <div
              className="pointer-events-none absolute bottom-4 h-44 w-44 rounded-full blur-3xl"
              style={{ background: "hsl(8 85% 52% / 0.25)" }}
            />
            <img
              src={welcomeHero}
              alt=""
              draggable={false}
              className="relative max-h-[30dvh] w-[220px] object-contain"
            />
          </div>

          {/* Brand + tagline */}
          <div className="flex flex-col items-center text-center animate-fade-in-up stagger-2">
            <MountainFlagLogo className="mb-1.5 h-11 w-11" />
            <h1 dir="ltr" className="text-[26px] font-black tracking-tight">
              <span className="text-foreground">HARD</span>{" "}
              <span className="text-primary">CHALLENGE</span>
            </h1>
            <p className="mt-1 text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("تحدَّ نفسك، وابنِ أفضل نسخة منك", "Challenge yourself. Build a better you.")}
            </p>
          </div>

          {/* Native-only: in-app-browser Google button + "OR" divider, in place
              of Clerk's own social buttons (hidden via appearance on native). */}
          {isNativeApp && (
            <div className="mt-4 flex flex-col gap-4 animate-fade-in-up stagger-3">
              <NativeGoogleButton />
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {bi("أو", "or")}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          {/* Clerk auth form — directly on the page, no card */}
          <div className="mt-4 flex justify-center animate-fade-in-up stagger-3">
            {view === "signup" ? (
              <SignUp {...clerkProps} signInUrl="/auth?mode=signin" />
            ) : (
              <SignIn {...clerkProps} signUpUrl="/auth?mode=signup" />
            )}
          </div>

          {/* Custom sign-in / sign-up toggle */}
          <div
            className="mt-6 text-center text-sm font-semibold"
            style={{ color: "hsl(var(--duo-muted))" }}
          >
            {view === "signup" ? (
              <>
                {bi("لديك حساب بالفعل؟", "Already have an account?")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/auth?mode=signin")}
                  className="font-bold text-primary transition-colors hover:text-primary/80"
                >
                  {bi("تسجيل الدخول", "Sign in")}
                </button>
              </>
            ) : (
              <>
                {bi("ليس لديك حساب؟", "Don't have an account?")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/auth?mode=signup")}
                  className="font-bold text-primary transition-colors hover:text-primary/80"
                >
                  {bi("سجّل الآن", "Sign up")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
