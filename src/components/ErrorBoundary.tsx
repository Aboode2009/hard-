import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort guard around the whole app. Without it, any uncaught render
 * error blanks the screen with no message and no way back — especially bad in
 * the native WebView, where the user can only force-quit.
 *
 * Language is read straight from localStorage rather than i18next: this must
 * still render correctly if the failure happened inside i18n itself.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isArabic = (localStorage.getItem("language") || "ar").startsWith("ar");

    return (
      <div
        className="duo-page flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-6 text-center"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="duo-card w-full max-w-sm p-8">
          <div className="mb-3 text-5xl">😵‍💫</div>
          <h1
            className="text-xl font-extrabold"
            style={{ color: "hsl(var(--duo-text))" }}
          >
            {isArabic ? "صار خطأ غير متوقع" : "Something went wrong"}
          </h1>
          <p
            className="mt-2 text-sm font-semibold leading-relaxed"
            style={{ color: "hsl(var(--duo-muted))" }}
          >
            {isArabic
              ? "اعتذر عن الإزعاج. أعد تشغيل التطبيق للمتابعة — بياناتك محفوظة."
              : "Sorry about that. Reload to continue — your data is safe."}
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="duo-press mt-6 h-12 w-full rounded-2xl font-extrabold text-white"
            style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
          >
            {isArabic ? "إعادة التشغيل" : "Reload"}
          </button>
        </div>
      </div>
    );
  }
}
