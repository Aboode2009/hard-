import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { bi } from "@/i18n/bi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { shareableOrigin } from "@/config/auth";
import { isNativeApp, registerOAuthDeepLinkListener, startGoogleOAuth } from "@/lib/native-oauth";
import { GoogleSignInError, googleSignInAvailable } from "@/lib/native-google";
import { AppleSignInError, appleSignInAvailable, signInWithAppleNative } from "@/lib/native-apple";

type Mode = "signin" | "signup";

interface AuthFormProps {
  mode: Mode;
  onSignedIn: () => void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
    <path d="M16.37 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.58-.03-.01-2.4-.92-2.41-3.69ZM14.1 5.78c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28Z" />
  </svg>
);

/**
 * Email/password + Google sign-in against Supabase Auth, plus Sign in with
 * Apple on iOS.
 *
 * Built from the app's own components rather than a prebuilt widget, so it
 * matches the rest of the UI and the build carries no extra auth SDK: sign
 * in, sign up with email confirmation, password reset, and Google.
 */
export const AuthForm = ({ mode, onSignedIn }: AuthFormProps) => {
  useTranslation(); // keeps bi() reactive on language change

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "apple" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Native Google now finishes inside `startGoogleOAuth` via Credential
  // Manager, so nothing here is needed for it. The listener stays registered
  // only to catch the browser fallback, and for the deep link Supabase uses
  // for email confirmation and password-reset links.
  useEffect(() => {
    return registerOAuthDeepLinkListener((err) => {
      setBusy(null);
      if (err) {
        setError(bi("تعذّر إكمال تسجيل الدخول.", "Couldn't complete sign-in."));
        return;
      }
      onSignedIn();
    });
  }, [onSignedIn]);

  /** Supabase error codes are English and technical; users get Arabic. */
  const translateError = (raw: string): string => {
    const m = raw.toLowerCase();
    if (m.includes("invalid login credentials")) {
      return bi("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "Wrong email or password.");
    }
    if (m.includes("email not confirmed")) {
      return bi(
        "لم يتم تأكيد بريدك بعد. افتح الرابط المرسل إليك.",
        "Your email isn't confirmed yet. Open the link we sent you.",
      );
    }
    if (m.includes("already registered") || m.includes("already been registered")) {
      return bi("هذا البريد مسجّل بالفعل. سجّل الدخول بدلاً من ذلك.", "That email is already registered. Sign in instead.");
    }
    if (m.includes("password") && m.includes("6")) {
      return bi("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "Password must be at least 6 characters.");
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return bi("محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.", "Too many attempts. Wait a moment and try again.");
    }
    if (m.includes("network") || m.includes("fetch")) {
      return bi("تعذّر الاتصال. تأكد من الإنترنت.", "Connection failed. Check your internet.");
    }
    return bi("تعذّر إتمام العملية. حاول مرة أخرى.", "Something went wrong. Please try again.");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setBusy("email");
    setError(null);
    setNotice(null);

    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${shareableOrigin()}/` },
        });
        if (err) throw err;

        // With email confirmation on, Supabase returns a user but no session.
        if (!data.session) {
          setNotice(
            bi(
              "أرسلنا رابط تأكيد إلى بريدك. افتحه لتفعيل حسابك.",
              "We sent a confirmation link to your email. Open it to activate your account.",
            ),
          );
          setBusy(null);
          return;
        }
        onSignedIn();
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      onSignedIn();
    } catch (err) {
      console.error("[auth] email submit failed:", err);
      setError(translateError(String((err as Error)?.message ?? err)));
      setBusy(null);
    }
  };

  /** Native Google failures are specific enough to be worth naming. */
  const translateGoogleError = (err: unknown): string | null => {
    if (!(err instanceof GoogleSignInError)) {
      return bi("تعذّر بدء تسجيل الدخول بجوجل.", "Couldn't start Google sign-in.");
    }
    switch (err.kind) {
      case "cancelled":
        // The user closed the sheet on purpose; nagging them is noise.
        return null;
      case "no-accounts":
        return bi(
          "لا يوجد حساب Google على هذا الجهاز. أضِف حساباً من إعدادات الجهاز ثم حاول مجدداً.",
          "No Google account on this device. Add one in Settings, then try again.",
        );
      case "network":
        return bi("تعذّر الاتصال. تأكد من الإنترنت.", "Connection failed. Check your internet.");
      case "config":
        return bi(
          "إعداد تسجيل الدخول بجوجل غير مكتمل لهذه النسخة.",
          "Google sign-in isn't configured for this build.",
        );
      default:
        return bi("تعذّر تسجيل الدخول بجوجل. حاول مرة أخرى.", "Google sign-in failed. Please try again.");
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy("google");
    setError(null);
    setNotice(null);
    try {
      await startGoogleOAuth();
      // Native: the session exists by the time this resolves.
      // Web: the page has already navigated away, so this never runs.
      if (isNativeApp) {
        onSignedIn();
        return;
      }
    } catch (err) {
      console.error("[auth] google failed:", err);
      const message = translateGoogleError(err);
      if (message) setError(message);
      setBusy(null);
    }
  };

  const handleApple = async () => {
    if (busy) return;
    setBusy("apple");
    setError(null);
    setNotice(null);
    try {
      await signInWithAppleNative();
      onSignedIn();
    } catch (err) {
      console.error("[auth] apple failed:", err);
      // Closing the sheet on purpose isn't an error worth showing.
      if (!(err instanceof AppleSignInError && err.kind === "cancelled")) {
        setError(bi("تعذّر تسجيل الدخول عبر Apple. حاول مرة أخرى.", "Apple sign-in failed. Please try again."));
      }
      setBusy(null);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    if (!email.trim()) {
      setError(bi("أدخل بريدك الإلكتروني أولاً.", "Enter your email first."));
      return;
    }
    setBusy("reset");
    setError(null);
    setNotice(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${shareableOrigin()}/`,
      });
      if (err) throw err;
      setNotice(
        bi(
          "أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.",
          "We sent a password reset link to your email.",
        ),
      );
    } catch (err) {
      console.error("[auth] reset failed:", err);
      setError(translateError(String((err as Error)?.message ?? err)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {appleSignInAvailable && (
        // Apple's own button style: black, white logo, same size as Google's.
        <button
          type="button"
          onClick={handleApple}
          disabled={busy !== null}
          className="mb-3 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-black font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-black"
        >
          <AppleIcon />
          {busy === "apple"
            ? bi("جارٍ الفتح…", "Opening…")
            : bi("المتابعة عبر Apple", "Continue with Apple")}
        </button>
      )}

      {googleSignInAvailable && (
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy !== null}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-muted/40 font-bold text-foreground transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleIcon />
          {busy === "google"
            ? bi("جارٍ الفتح…", "Opening…")
            : bi("المتابعة عبر Google", "Continue with Google")}
        </button>
      )}

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {bi("أو", "or")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          dir="ltr"
          placeholder={bi("البريد الإلكتروني", "Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 rounded-2xl text-base"
        />

        <Input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={6}
          dir="ltr"
          placeholder={bi("كلمة المرور", "Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 rounded-2xl text-base"
        />

        <Button
          type="submit"
          disabled={busy !== null}
          className="h-12 rounded-2xl text-base font-extrabold"
        >
          {busy === "email"
            ? bi("لحظة…", "One moment…")
            : mode === "signup"
              ? bi("إنشاء حساب", "Create account")
              : bi("تسجيل الدخول", "Sign in")}
        </Button>
      </form>

      {mode === "signin" && (
        <button
          type="button"
          onClick={handleReset}
          disabled={busy !== null}
          className="mt-3 w-full text-center text-sm font-semibold text-primary disabled:opacity-60"
        >
          {busy === "reset"
            ? bi("جارٍ الإرسال…", "Sending…")
            : bi("نسيت كلمة المرور؟", "Forgot your password?")}
        </button>
      )}

      {error && (
        <p
          className="mt-3 flex items-start gap-2 text-sm font-semibold text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {notice && (
        <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-muted-foreground">
          {notice.includes("تأكيد") || notice.toLowerCase().includes("confirm") ? (
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notice}</span>
        </p>
      )}

    </div>
  );
};
