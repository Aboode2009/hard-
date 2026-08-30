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
  | "cancelled"
  | "no_barcode";

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
 * as an on-demand module. Ensure it's installed (first run may download it),
 * polling availability for up to ~30s while Play services fetches it.
 */
async function ensureGoogleScannerModule(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;

  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (available) return;

  await BarcodeScanner.installGoogleBarcodeScannerModule();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const check = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (check.available) return;
  }
  throw new ScanError("module_unavailable");
}

/**
 * Open the native in-app scanner and resolve with the scanned text.
 * Rejects with ScanError so the dialog can offer retry / open-settings.
 */
export async function scanNativeBarcode(): Promise<string> {
  const { camera } = await BarcodeScanner.requestPermissions();
  if (camera !== "granted" && camera !== "limited") {
    throw new ScanError("permission_denied");
  }

  await ensureGoogleScannerModule();

  let result;
  try {
    result = await BarcodeScanner.scan({ formats: FORMATS });
  } catch (err) {
    // The plugin rejects when the user closes the scanner without scanning.
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("cancel")) throw new ScanError("cancelled");
    throw err;
  }

  const value = result.barcodes[0]?.rawValue ?? result.barcodes[0]?.displayValue;
  if (!value) throw new ScanError("no_barcode");
  return value;
}

/** Open the OS app settings so the user can grant the camera permission. */
export async function openScannerSettings(): Promise<void> {
  await BarcodeScanner.openSettings();
}
