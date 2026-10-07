import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { Building2, CameraOff, CheckCircle2, Clock3, Crown, Download, RefreshCw, ScanLine, Settings, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bi } from "@/i18n/bi";
import {
  isNativeScannerPlatform,
  scanNativeBarcode,
  openScannerSettings,
  ScanError,
} from "@/lib/attendance-scanner";

const GREEN = "#58CC02";
const AMBER = "#FFC800";
const RED = "#FF4B4B";

/** Every verdict record_attendance can return. */
type AttendanceStatus =
  | "on_time"
  | "late"
  | "invalid_code"
  | "too_early"
  | "too_late"
  | "already"
  | "premium_required"
  | "no_company"
  | "no_config"
  | "unauthenticated";

/** Row returned by the record_attendance RPC (server does ALL validation). */
interface AttendanceResult {
  success: boolean;
  status: AttendanceStatus;
  message: string;
  checked_in_at: string | null;
}

/**
 * `supabase.rpc()` hands back a PostgrestFilterBuilder — a thenable you can
 * `await`, but NOT a real promise: it has no `.catch()` and no `.finally()`.
 * Always `await` these calls inside try/catch.
 */
interface AttendanceWindow {
  window_start: string;
  window_end: string;
  display_time: string | null;
  timezone: string;
}

type Phase =
  | "scanning" // camera open (web video / native fullscreen scanner)
  | "downloading" // Android is fetching the Play services scanner module
  | "verifying" // RPC in flight
  | "result" // server answered — show colored message
  | "permission" // camera permission denied
  | "timeout" // web scan ran too long without a detection
  | "unsupported" // this device cannot run the native scanner at all
  | "error"; // unexpected failure

interface AttendanceScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fired when the server says today's check-in exists: 'on_time'/'late' are
   * fresh check-ins (award points), 'already' means it happened earlier today
   * (sync the UI only — the server refuses duplicates).
   */
  onAttendanceRecorded: (status: "on_time" | "late" | "already") => void;
}

const WEB_SCAN_TIMEOUT_MS = 45_000;

/**
 * Resolve once the portal-mounted <video> is in the DOM (or give up after ~2s).
 * Radix mounts dialog content asynchronously, so the ref is empty on the tick
 * where the scan starts.
 */
async function waitForVideoElement(
  ref: React.MutableRefObject<HTMLVideoElement | null>,
): Promise<HTMLVideoElement | null> {
  for (let i = 0; i < 40; i++) {
    if (ref.current) return ref.current;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

/**
 * Camera-only attendance check-in. Native (Capacitor) uses ML Kit's fullscreen
 * in-app scanner; web uses a live camera preview with @zxing/browser. There is
 * deliberately NO manual input on any platform. The scanned value goes straight
 * to the record_attendance RPC and the server's Arabic `message` is displayed
 * verbatim — green (on_time), amber (late), red (any failure).
 */
export const AttendanceScannerDialog = ({
  open,
  onOpenChange,
  onAttendanceRecorded,
}: AttendanceScannerDialogProps) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  /** true when the error phase is specifically "no usable camera". */
  const [noCamera, setNoCamera] = useState(false);
  const [attendanceWindow, setAttendanceWindow] = useState<AttendanceWindow | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  // Guards double-submits: zxing keeps firing detections until stopped.
  const submittedRef = useRef(false);

  const stopWebScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    clearTimeout(timeoutRef.current);
  }, []);

  /** Send the scanned value to the server and show its verdict. */
  const submitScan = useCallback(
    async (scannedValue: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      stopWebScanner();
      setPhase("verifying");

      const { data, error } = await supabase.rpc("record_attendance", {
        p_scanned_value: scannedValue,
      });

      if (error) {
        console.error("record_attendance failed:", error);
        setPhase("error");
        return;
      }

      const row: AttendanceResult | undefined = data?.[0] as AttendanceResult | undefined;
      if (!row) {
        setPhase("error");
        return;
      }

      setResult(row);
      setPhase("result");
      if (row.status === "on_time" || row.status === "late" || row.status === "already") {
        onAttendanceRecorded(row.status);
      }
    },
    [onAttendanceRecorded, stopWebScanner],
  );

  /** Start (or restart) the platform scanner. */
  const startScan = useCallback(async () => {
    submittedRef.current = false;
    setResult(null);
    setNoCamera(false);
    setPhase("scanning");

    if (isNativeScannerPlatform) {
      try {
        // First ever scan on Android may need the Play services scanner module;
        // the callback swaps the spinner text so the wait is explained.
        const value = await scanNativeBarcode(() => setPhase("downloading"));
        await submitScan(value);
      } catch (err) {
        if (err instanceof ScanError) {
          if (err.reason === "permission_denied") setPhase("permission");
          else if (err.reason === "cancelled") onOpenChange(false);
          else if (err.reason === "module_unavailable") setPhase("unsupported");
          else setPhase("error");
        } else {
          console.error("Native scan failed:", err);
          setPhase("error");
        }
      }
      return;
    }

    // Web: live camera preview + continuous decoding until the first hit.
    try {
      const reader = new BrowserMultiFormatReader();
      // The dialog content mounts in a portal, so the <video> element may not
      // exist yet on the first tick — wait for it instead of bailing out
      // silently (which would strand the user on a black preview).
      const video = await waitForVideoElement(videoRef);
      if (!video) {
        setPhase("error");
        return;
      }
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        video,
        (scanResult) => {
          if (scanResult) void submitScan(scanResult.getText());
        },
      );
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!submittedRef.current) {
          stopWebScanner();
          setPhase("timeout");
        }
      }, WEB_SCAN_TIMEOUT_MS);
    } catch (err) {
      console.error("Web camera failed:", err);
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPhase("permission");
      } else {
        // NotFoundError / NotReadableError / OverconstrainedError: no usable
        // camera on this device, or another app is holding it.
        setNoCamera(name === "NotFoundError" || name === "NotReadableError");
        setPhase("error");
      }
    }
  }, [onOpenChange, stopWebScanner, submitScan]);

  // Open → fetch the attendance window (display only) and start scanning.
  useEffect(() => {
    if (!open) {
      stopWebScanner();
      return;
    }
    let alive = true;

    // The window is a nicety — it shows the allowed check-in time. A failure
    // here must never take the scanner down with it, so it is awaited inside
    // its own try/catch and its result is optional everywhere below.
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_attendance_window");
        if (error) throw new Error(error.message);
        if (!alive) return;

        // A TABLE(...) function returns an array of rows, and it is legitimately
        // EMPTY for a user with no company or no active subscription — so there
        // may be no row at all, and `row` stays undefined.
        const row: AttendanceWindow | undefined = data?.[0];
        if (row) setAttendanceWindow(row);
      } catch (err) {
        console.warn("get_attendance_window failed:", err);
      }
    })();

    void startScan();
    return () => {
      alive = false;
      stopWebScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Every status the server can return, handled explicitly.
   *
   * `action` decides the button under the message: "done" closes on a success,
   * "retry" re-opens the camera for something the user can fix by scanning
   * again, "subscribe" routes to checkout, "close" is a dead end.
   *
   * Typed as a full Record of AttendanceStatus, so adding a status to the union
   * without handling it here is a compile error rather than a blank screen.
   */
  const STATUS_UI: Record<
    AttendanceStatus,
    { color: string; Icon: typeof CheckCircle2; action: "done" | "retry" | "subscribe" | "close" }
  > = {
    on_time: { color: GREEN, Icon: CheckCircle2, action: "done" },
    late: { color: AMBER, Icon: Clock3, action: "done" },
    already: { color: AMBER, Icon: CheckCircle2, action: "done" },
    too_early: { color: AMBER, Icon: Clock3, action: "close" },
    premium_required: { color: AMBER, Icon: Crown, action: "subscribe" },
    invalid_code: { color: RED, Icon: XCircle, action: "retry" },
    too_late: { color: RED, Icon: XCircle, action: "close" },
    no_company: { color: RED, Icon: Building2, action: "close" },
    no_config: { color: RED, Icon: XCircle, action: "close" },
    unauthenticated: { color: RED, Icon: XCircle, action: "close" },
  };

  // A status outside the union would mean the server grew one we do not know
  // about; treat it as a plain failure rather than crashing on a missing entry.
  const ui = (result && STATUS_UI[result.status]) || {
    color: RED,
    Icon: XCircle,
    action: "close" as const,
  };
  const resultColor = ui.color;
  const ResultIcon = ui.Icon;

  /**
   * The check-in window line.
   *
   * `get_attendance_window` returns a TABLE, so it is legitimately empty for a
   * user with no company or no subscription — and even when a row exists its
   * columns can be null. Both are checked, because interpolating a null here
   * printed "الحضور من null إلى null" on screen.
   */
  const windowLine = (() => {
    if (!attendanceWindow) return null;
    if (attendanceWindow.display_time) return attendanceWindow.display_time;
    const { window_start: from, window_end: to } = attendanceWindow;
    if (!from || !to) return null;
    return bi(`الحضور من ${from} إلى ${to}`, `Check-in from ${from} to ${to}`);
  })();

  const retryButton = (label: string) => (
    <button
      type="button"
      onClick={() => void startScan()}
      className="duo-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-extrabold text-white"
      style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
    >
      <RefreshCw className="h-5 w-5" strokeWidth={2.5} />
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* aria-describedby={undefined}: this dialog's body is a live camera and a
          status message, not static descriptive prose, so Radix is told there
          is intentionally no description rather than warning on every open. */}
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle
            className="flex items-center justify-center gap-2 text-center text-lg font-extrabold"
            style={{ color: "hsl(var(--duo-text))" }}
          >
            <ScanLine className="h-5 w-5 text-primary" strokeWidth={2.5} />
            {bi("تسجيل حضور الساعة 8", "8 o'clock check-in")}
          </DialogTitle>
        </DialogHeader>

        {windowLine && (
          <p
            className="-mt-2 text-center text-sm font-semibold"
            style={{ color: "hsl(var(--duo-muted))" }}
          >
            {windowLine}
          </p>
        )}

        {phase === "scanning" && (
          <div className="space-y-3">
            {isNativeScannerPlatform ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                  {bi("جارٍ فتح الكاميرا…", "Opening the camera…")}
                </p>
              </div>
            ) : (
              <>
                <div className="relative overflow-hidden rounded-2xl border-2 border-[hsl(var(--duo-border))] bg-black">
                  {/* Live web camera preview; zxing decodes frames continuously.
                      autoPlay is required — without it the element never starts
                      the attached stream and the decoder only sees black frames. */}
                  <video
                    ref={videoRef}
                    className="aspect-square w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
                </div>
                <p
                  className="text-center text-sm font-semibold"
                  style={{ color: "hsl(var(--duo-muted))" }}
                >
                  {bi("وجّه الكاميرا نحو باركود الشركة", "Point the camera at the company barcode")}
                </p>
              </>
            )}
          </div>
        )}

        {phase === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("جارٍ التحقق من الحضور…", "Verifying attendance…")}
            </p>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4 py-2">
            <div
              className="flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center"
              style={{ borderColor: resultColor, background: `${resultColor}14` }}
            >
              <ResultIcon className="h-10 w-10" style={{ color: resultColor }} strokeWidth={2.5} />
              {/* The server's message is Arabic and display-ready — shown verbatim */}
              <p className="text-base font-extrabold leading-relaxed" style={{ color: resultColor }}>
                {result.message}
              </p>
            </div>
            {ui.action === "done" ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="duo-press h-12 w-full rounded-2xl font-extrabold text-white"
                style={{ background: GREEN, boxShadow: "0 4px 0 #45A302" }}
              >
                {bi("تم", "Done")}
              </button>
            ) : ui.action === "retry" ? (
              retryButton(bi("إعادة المسح", "Scan again"))
            ) : ui.action === "subscribe" ? (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/premium");
                }}
                className="duo-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-extrabold text-white"
                style={{ background: AMBER, boxShadow: "0 4px 0 #D9A800" }}
              >
                <Crown className="h-5 w-5" strokeWidth={2.5} />
                {bi("اشترك الآن", "Subscribe now")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="duo-card duo-press h-12 w-full rounded-2xl font-extrabold"
                style={{ color: "hsl(var(--duo-text))" }}
              >
                {bi("إغلاق", "Close")}
              </button>
            )}
          </div>
        )}

        {phase === "downloading" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Download className="h-9 w-9 animate-pulse text-primary" strokeWidth={2.5} />
            <p className="text-sm font-bold leading-relaxed" style={{ color: "hsl(var(--duo-text))" }}>
              {bi(
                "جارٍ تجهيز الماسح لأول مرة…",
                "Getting the scanner ready for the first time…",
              )}
            </p>
            <p className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi(
                "يحدث هذا مرة واحدة فقط ويحتاج اتصالاً بالإنترنت.",
                "This happens once and needs an internet connection.",
              )}
            </p>
          </div>
        )}

        {phase === "unsupported" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#FF4B4B] bg-[#FF4B4B14] p-5 text-center">
              <CameraOff className="h-10 w-10 text-[#FF4B4B]" strokeWidth={2.5} />
              <p className="text-sm font-bold leading-relaxed" style={{ color: "hsl(var(--duo-text))" }}>
                {bi(
                  "هذا الجهاز لا يدعم ماسح الباركود. تأكد من تحديث خدمات Google Play ثم أعد المحاولة.",
                  "This device can't run the barcode scanner. Update Google Play services, then try again.",
                )}
              </p>
            </div>
            {retryButton(bi("إعادة المحاولة", "Try again"))}
          </div>
        )}

        {phase === "permission" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#FF4B4B] bg-[#FF4B4B14] p-5 text-center">
              <CameraOff className="h-10 w-10 text-[#FF4B4B]" strokeWidth={2.5} />
              <p className="text-sm font-bold leading-relaxed" style={{ color: "hsl(var(--duo-text))" }}>
                {bi(
                  "لا يمكن فتح الكاميرا لأن الإذن مرفوض. اسمح للتطبيق باستخدام الكاميرا ثم أعد المحاولة.",
                  "Camera permission was denied. Allow camera access, then try again.",
                )}
              </p>
            </div>
            {isNativeScannerPlatform && (
              <button
                type="button"
                onClick={() => void openScannerSettings()}
                className="duo-card duo-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-extrabold"
                style={{ color: "hsl(var(--duo-text))" }}
              >
                <Settings className="h-5 w-5" strokeWidth={2.5} />
                {bi("فتح الإعدادات", "Open settings")}
              </button>
            )}
            {retryButton(bi("إعادة المحاولة", "Try again"))}
          </div>
        )}

        {phase === "timeout" && (
          <div className="space-y-4 py-2">
            <p
              className="text-center text-sm font-bold leading-relaxed"
              style={{ color: "hsl(var(--duo-text))" }}
            >
              {bi(
                "لم يتم التعرف على أي باركود. قرّب الكاميرا من الباركود وحاول مجدداً.",
                "No barcode was detected. Move closer to the barcode and try again.",
              )}
            </p>
            {retryButton(bi("إعادة المسح", "Scan again"))}
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-4 py-2">
            <p
              className="text-center text-sm font-bold leading-relaxed"
              style={{ color: "hsl(var(--duo-text))" }}
            >
              {noCamera
                ? bi(
                    "تعذّر الوصول إلى الكاميرا. تأكد من وجود كاميرا متاحة وأن تطبيقاً آخر لا يستخدمها، ثم حاول مجدداً.",
                    "Could not access the camera. Make sure a camera is available and not in use by another app, then try again.",
                  )
                : bi(
                    "حدث خطأ غير متوقع أثناء المسح أو التحقق. حاول مرة أخرى.",
                    "Something went wrong while scanning or verifying. Please try again.",
                  )}
            </p>
            {retryButton(bi("إعادة المحاولة", "Try again"))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
