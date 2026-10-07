import { bi } from "@/i18n/bi";
import { ThemeStore } from "@/components/ThemeStore";

const ThemeStorePage = () => (
  <div
    className="duo-page min-h-screen bg-background"
    dir={bi("rtl", "ltr")}
    style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
  >
    <div className="max-w-lg mx-auto px-4 pt-5">
      <ThemeStore />
    </div>
  </div>
);

export default ThemeStorePage;
