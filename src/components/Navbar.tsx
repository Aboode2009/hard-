import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { bi } from "@/i18n/bi";

interface NavbarProps {
  isAdmin?: boolean;
  showLogout?: boolean;
}

/**
 * Top bar for the pages reached from Settings (calendar, reminders, backups).
 * They sit outside the tab bar, so the bar carries its own back button —
 * without it the only way out was the system back gesture.
 */
export const Navbar = (_props: NavbarProps) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-border/30"
      style={{
        // Solid rather than blurred: backdrop-filter re-blurs everything
        // behind the bar on every scroll frame, which Android WebViews
        // handle poorly.
        background: 'hsl(var(--background) / 0.96)',
      }}
    >
      <div className="container flex h-14 items-center justify-between gap-3 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="duo-card duo-press flex h-10 w-10 items-center justify-center"
          style={{ borderRadius: "0.875rem" }}
          aria-label={bi("رجوع", "Back")}
        >
          {isRTL
            ? <ChevronRight className="h-5 w-5" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            : <ChevronLeft className="h-5 w-5" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
        </button>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xl font-extrabold tracking-wide"
          style={{ color: "hsl(var(--duo-text))" }}
          dir="ltr"
        >
          HARD <span className="text-primary">21</span>
        </button>

        <LanguageSwitcher />
      </div>
    </nav>
  );
};
