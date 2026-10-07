import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Changing this (the current pathname) clears a previous error. */
  resetKey: string;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
  /** Bumped by "try again" to force the failed subtree to remount. */
  attempt: number;
}

/**
 * Per-route error boundary, sitting inside the app-wide one in main.tsx.
 *
 * Without it, a render error anywhere — or a lazy chunk that fails to load —
 * takes down the entire app and leaves the user on a dead screen. Here the
 * failure is contained to the route, and simply navigating elsewhere clears
 * it, because `resetKey` changes with the path.
 *
 * A failed dynamic import is called out separately: it almost always means the
 * cached chunk no longer matches a freshly deployed build, and a reload fixes
 * it, so that case offers a reload instead of a "go back".
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    const message = String(error?.message ?? error);
    const isChunkError =
      /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(
        message,
      );
    return { hasError: true, isChunkError };
  }

  /** Re-mount the children and let them try their data fetches again. */
  private retry = () => {
    this.setState((prev) => ({
      hasError: false,
      isChunkError: false,
      attempt: prev.attempt + 1,
    }));
  };

  componentDidUpdate(prev: Props) {
    // Navigating away from a broken route recovers automatically.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, isChunkError: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      // Keyed by attempt so "try again" genuinely remounts the subtree rather
      // than re-rendering a component that is still holding its failed state.
      return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
    }

    // Read straight from localStorage rather than i18next: this must still
    // render correctly if the failure happened inside i18n itself.
    const isArabic = (localStorage.getItem("language") || "ar").startsWith("ar");
    const { isChunkError } = this.state;

    return (
      <div
        className="duo-page flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-6 text-center"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="duo-card w-full max-w-sm p-8">
          <div className="mb-3 text-5xl">{isChunkError ? "🔄" : "😵‍💫"}</div>

          <h1 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {isChunkError
              ? isArabic
                ? "تحتاج إعادة تحميل"
                : "A reload is needed"
              : isArabic
                ? "تعذّر فتح هذه الصفحة"
                : "This page couldn't open"}
          </h1>

          <p
            className="mt-2 text-sm font-semibold leading-relaxed"
            style={{ color: "hsl(var(--duo-muted))" }}
          >
            {isChunkError
              ? isArabic
                ? "صدر تحديث للتطبيق. أعد التحميل للمتابعة — بياناتك محفوظة."
                : "The app was updated. Reload to continue — your data is safe."
              : isArabic
                ? "بقية التطبيق ما زال يعمل. ارجع وحاول مرة أخرى."
                : "The rest of the app still works. Go back and try again."}
          </p>

          <button
            type="button"
            onClick={isChunkError ? () => window.location.reload() : this.retry}
            className="duo-press mt-6 h-12 w-full rounded-2xl font-extrabold text-white"
            style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
          >
            {isChunkError
              ? isArabic
                ? "إعادة التحميل"
                : "Reload"
              : isArabic
                ? "إعادة المحاولة"
                : "Try again"}
          </button>

          {!isChunkError && (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-2 h-11 w-full rounded-2xl font-bold"
              style={{ color: "hsl(var(--duo-muted))" }}
            >
              {isArabic ? "رجوع" : "Go back"}
            </button>
          )}
        </div>
      </div>
    );
  }
}
