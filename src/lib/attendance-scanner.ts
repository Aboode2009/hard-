import { Capacitor } from "@capacitor/core";
import {
  BarcodeScanner,
  BarcodeFormat,
} from "@capacitor-mlkit/barcode-scanning";

/**
 * Native (Capacitor) barcode scanning for the NASS attendance task, using
 * Google ML Kit's ready-to-use scanner (`BarcodeScanner.scan`): a full camera
 * UI opens inside the app and returns automatically the moment a code is
 * detected — no manual typing anywhere.
 *
 * The WEB fallback (live getUserMedia + @zxing/browser) lives in
 * AttendanceScannerDialog, because it needs a <video> element in the DOM.
 */

export const isNativeScannerPlatform = Capacitor.isNativePlatform();

/** Typed failure reasons the UI turns into Arabic messages + actions. */
export type ScanFailure =
  | "permission_denied"
  | "module_unavailable"
  | "module_timeout"
  | "cancelled"
  | "no_barcode"
  | "plugin_error";

export class ScanError extends Error {
  constructor(public reason: ScanFailure) {
    super(reason);
  }
}

/** Formats we accept for the company attendance code. */
const FORMATS = [
  BarcodeFormat.QrCode,
  BarcodeFormat.Code128,
  BarcodeFormat.Code39,
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
];

/**
 * Android only: the ready-to-use scanner is delivered by Google Play services
 * as an on-demand module, downloaded the first time it is needed.
 *
 * This used to poll for up to 30 seconds with nothing on screen but "opening
 * the camera", so a first-ever scan looked exactly like a hang and then failed
 * with a bare error. `onDownloading` lets the dialog say what is happening.
 */
async function ensureGoogleScannerModule(onDownloading?: () => void): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;

  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (available) return;

  onDownloading?.();

  try {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
  } catch (err) {
    // Play services missing or too old — the scanner cannot be installed here.
    console.error("installGoogleBarcodeScannerModule failed:", err);
    throw new ScanError("module_unavailable");
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const check = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (check.available) return;
  }
  // It may still be downloading on a slow connection; retrying is worthwhile,
  // which is a different message from "this device cannot do it at all".
  throw new ScanError("module_timeout");
}

/**
 * Open the native in-app scanner and resolve with the scanned text.
 * Rejects with ScanError so the dialog can offer retry / open-settings.
 */
export async function scanNativeBarcode(onDownloading?: () => void): Promise<string> {
  let camera: string;
  try {
    ({ camera } = await BarcodeScanner.requestPermissions());
  } catch (err) {
    // A throw here means the plugin itself is not reachable — not a permission
    // decision. Surfacing that separately stops it reading as "denied".
    console.error("requestPermissions failed:", err);
    throw new ScanError("plugin_error");
  }
  if (camera !== "granted" && camera !== "limited") {
    throw new ScanError("permission_denied");
  }

  await ensureGoogleScannerModule(onDownloading);

  let result;
  try {
    result = await BarcodeScanner.scan({ formats: FORMATS });
  } catch (err) {
    // The plugin rejects when the user closes the scanner without scanning.
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("cancel") || msg.includes("dismiss")) throw new ScanError("cancelled");
    console.error("BarcodeScanner.scan failed:", err);
    throw new ScanError("plugin_error");
  }

  const value = result.barcodes[0]?.rawValue ?? result.barcodes[0]?.displayValue;
  if (!value) throw new ScanError("no_barcode");
  return value;
}

/** Open the OS app settings so the user can grant the camera permission. */
export async function openScannerSettings(): Promise<void> {
  await BarcodeScanner.openSettings();
}
