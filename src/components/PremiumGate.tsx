import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { bi } from "@/i18n/bi";

interface PremiumGateProps {
  /** Headline, e.g. "هذه الميزة للمشتركين". */
  title: string;
  /** Optional supporting line explaining what unlocks. */
  message?: string;
}

/**
 * The "subscribers only" lock shown in place of a gated feature.
 *
 * Purely presentational — callers decide when to render it by checking the
 * server (`is_premium_active` / `can_advance_to_next_path`).
 */
export const PremiumGate = ({ title, message }: PremiumGateProps) => {
  const navigate = useNavigate();

  return (
    <div className="duo-card mx-auto max-w-lg px-5 py-8 text-center">
      <div
        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "#FFC8001e" }}
      >
        <Lock className="h-9 w-9" style={{ color: "#FFC800" }} strokeWidth={2.5} />
      </div>

      <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
        {title}
      </h2>

      {message && (
        <p
          className="mt-2 text-sm font-semibold leading-relaxed"
          style={{ color: "hsl(var(--duo-muted))" }}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={() => navigate("/premium")}
        className="duo-press mt-6 h-14 w-full rounded-2xl text-base font-extrabold text-white"
        style={{ background: "#FFC800", boxShadow: "0 4px 0 #D9A800" }}
      >
        {bi("اشترك", "Subscribe")}
      </button>
    </div>
  );
};

/** 👑 shown next to subscribers' names in the leaderboard. */
export const PremiumBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`flex-shrink-0 leading-none ${className}`}
    title={bi("مشترك بريميوم", "Premium subscriber")}
    aria-label={bi("مشترك بريميوم", "Premium subscriber")}
    role="img"
  >
    👑
  </span>
);
