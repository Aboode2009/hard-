import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { CameraOff, CheckCircle2, Clock3, RefreshCw, ScanLine, Settings, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bi } from "@/i18n/bi";
import {
  isNativeScannerPlatform,
  scanNativeBarcode,
  openScannerSettings,
  ScanError,
} from "@/lib/attendance-scanner";

/** Row returned by the record_attendance RPC (server does ALL validation). */
interface AttendanceResult {
  success: boolean;
  status:
    | "on_time"
    | "late"
    | "invalid_code"
    | "too_early"
    | "too_late"
    | "already"
    | "no_company"
    | "no_config"
    | "unauthenticated";
  message: string;
  checked_in_at: string | null;
}

interface AttendanceWindow {
  window_start: string;
  window_end: string;
  display_time: string | null;
  timezone: string;
}

type Phase =
  | "scanning" // camera open (web video / native fullscreen scanner)
  | "verifying" // RPC in flight
  | "result" // server answered — show colored message
  | "permission" // camera permission denied
  | "timeout" // web scan ran too long without a detection
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

      const row = (Array.isArray(data) ? data[0] : data) as AttendanceResult | undefined;
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
        const value = await scanNativeBarcode();
        await submitScan(value);
      } catch (err) {
        if (err instanceof ScanError) {
          if (err.reason === "permission_denied") setPhase("permission");
          else if (err.reason === "cancelled") onOpenChange(false);
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
    supabase
      .rpc("get_attendance_window")
      .then(({ data }) => {
        const row = (Array.isArray(data) ? data[0] : data) as AttendanceWindow | undefined;
        if (row) setAttendanceWindow(row);
      });
    void startScan();
    return stopWebScanner;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resultColor =
    result?.status === "on_time"
      ? "#58CC02"
      : result?.status === "late"
        ? "#FFC800"
        : "#FF4B4B";
  const ResultIcon =
    result?.status === "on_time" ? CheckCircle2 : result?.status === "late" ? Clock3 : XCircle;

  const windowLine = attendanceWindow
    ? attendanceWindow.display_time ||
      bi(
        `الحضور من ${attendanceWindow.window_start} إلى ${attendanceWindow.window_end}`,
        `Check-in from ${attendanceWindow.window_start} to ${attendanceWindow.window_end}`,
      )
    : null;

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
      <DialogContent className="max-w-sm">
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
            {result.success ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="duo-press h-12 w-full rounded-2xl font-extrabold text-white"
                style={{ background: "#58CC02", boxShadow: "0 4px 0 #45A302" }}
              >
                {bi("تم", "Done")}
              </button>
            ) : result.status === "invalid_code" ? (
              retryButton(bi("إعادة المسح", "Scan again"))
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
