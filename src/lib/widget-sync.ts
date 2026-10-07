import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * Feeds the Android home-screen widgets.
 *
 * The widgets can't reach Supabase or this WebView, so the app hands them a
 * small JSON snapshot through the local `HardWidget` plugin
 * (android/app/src/main/java/com/hardchallenge/app/widget), which stores it in
 * SharedPreferences and redraws every placed widget. The native side reads
 * the snapshot against Baghdad's date, so after midnight it can roll a
 * completed day forward on its own, or ask the user to open the app when it
 * can't know the outcome.
 *
 * No-op on the web and iOS.
 */

export interface WidgetTask {
  title: string;
  done: boolean;
}

export type WidgetSnapshot =
  | { signedIn: false; lang: "ar" | "en" }
  | {
      signedIn: true;
      lang: "ar" | "en";
      /** Baghdad date (YYYY-MM-DD) this snapshot describes. */
      date: string;
      day: number;
      totalDays: number;
      streak: number;
      /** Baghdad date (YYYY-MM-DD) of challenge day 1. */
      startDate: string;
      /** Challenge day numbers already completed; the week dots come from these. */
      completedDays: number[];
      dayCompleted: boolean;
      /** Today's required tasks, in the app's order. */
      tasks: WidgetTask[];
    };

interface HardWidgetPlugin {
  update(options: { snapshot: string }): Promise<void>;
  addListener(event: "openTasks", cb: () => void): Promise<PluginListenerHandle>;
}

const HardWidget = registerPlugin<HardWidgetPlugin>("HardWidget");

const supported = () => Capacitor.getPlatform() === "android";

/** The widget speaks Arabic or English; any other app language gets English. */
export const widgetLang = (language: string | undefined): "ar" | "en" =>
  language?.startsWith("ar") ? "ar" : "en";

let lastSent = "";

/**
 * Send a snapshot to the widgets. Identical consecutive snapshots are
 * skipped, so callers can push on every render-relevant change.
 */
export function pushWidgetSnapshot(snapshot: WidgetSnapshot): void {
  if (!supported()) return;
  const json = JSON.stringify(snapshot);
  if (json === lastSent) return;
  lastSent = json;
  HardWidget.update({ snapshot: json }).catch((err) => {
    // Forget it so the next change retries rather than being deduped away.
    lastSent = "";
    console.warn("Updating the home-screen widget failed:", err);
  });
}

/** Called when the user taps a widget. Returns an unsubscribe function. */
export function onWidgetOpenTasks(cb: () => void): () => void {
  if (!supported()) return () => {};
  const handle = HardWidget.addListener("openTasks", cb);
  return () => {
    void handle.then((h) => h.remove());
  };
}
