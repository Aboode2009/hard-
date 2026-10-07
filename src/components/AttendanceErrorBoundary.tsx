import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { bi } from "@/i18n/bi";

/**
 * Catches a crash inside the attendance scanner and keeps it local.
 *
 * Without this, a throw here unmounts up to the route boundary and the user is
 * told the whole page failed — which is both alarming and wrong, since the rest
 * of the challenge still works. The camera dialog is the riskiest screen in the
 * app (a native plugin, a live camera, and RPCs that return TABLEs whose rows
 * can be absent), so it gets its own net.
 *
 * `resetKey` clears the error when the dialog is reopened, so a transient
 * failure does not make the button look permanently broken.
 */
interface Props {
  children: ReactNode;
  resetKey?: unknown;
  onClose: () => void;
}

interface State {
  error: Error | null;
}

export class AttendanceErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the real stack in the console — the message below is deliberately
    // non-technical, and without this the cause would be lost entirely.
    console.error("[attendance] render crashed:", error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
        <div className="w-full max-w-sm space-y-4 rounded-3xl bg-background p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF4B4B14]">
            <AlertTriangle className="h-8 w-8 text-[#FF4B4B]" strokeWidth={2.5} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-extrabold text-foreground">
              {bi("تعذّر فتح ماسح الحضور", "Couldn't open the attendance scanner")}
            </h2>
            <p className="text-sm font-semibold leading-relaxed text-muted-foreground">
              {bi(
                "حدث خلل غير متوقّع أثناء فتح الكاميرا. بقية التطبيق تعمل بشكل طبيعي.",
                "Something went wrong opening the camera. The rest of the app is working normally.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={this.retry}
              className="duo-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-extrabold text-white"
              style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
            >
              <RefreshCw className="h-5 w-5" strokeWidth={2.5} />
              {bi("إعادة المحاولة", "Try again")}
            </button>
            <button
              type="button"
              onClick={this.props.onClose}
              className="duo-card duo-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-extrabold text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
              {bi("إغلاق", "Close")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
