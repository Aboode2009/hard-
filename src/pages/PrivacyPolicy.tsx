import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_PLACEHOLDER } from "@/config/contact";

/** Accent used for the numbered chips and the contact card. */
const ACCENT = "#1CB0F6";

/**
 * One numbered clause of the policy. Sections carry either a paragraph
 * (`body`) or a list (`bullets`) — never both — so the renderer handles each
 * shape independently.
 */
type PolicySection = {
  heading: string;
  body?: string;
  bullets?: string[];
};

/**
 * Splits the leading "3." off a heading so it can be shown as a chip. Purely
 * presentational: every character of the translated heading is still rendered.
 */
const splitHeading = (heading: string): { number: string | null; text: string } => {
  const match = /^(\d+)\.\s*(.+)$/.exec(heading);
  return match ? { number: match[1], text: match[2] } : { number: null, text: heading };
};

const SectionCard = ({ section }: { section: PolicySection }) => {
  const { number, text } = splitHeading(section.heading);

  return (
    <div className="duo-card px-4 py-4">
      <div className="flex items-center gap-3 mb-2.5">
        {number && (
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
            style={{ background: `${ACCENT}1e`, color: ACCENT }}
          >
            {number}
          </span>
        )}
        <h2 className="font-extrabold text-base leading-tight" style={{ color: "hsl(var(--duo-text))" }}>
          {text}
        </h2>
      </div>

      {section.body && (
        <p
          className="text-sm font-semibold leading-relaxed"
          style={{ color: "hsl(var(--duo-muted))" }}
        >
          {section.body}
        </p>
      )}

      {section.bullets?.length > 0 && (
        <ul className="space-y-2">
          {section.bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[0.5rem]"
                style={{ background: ACCENT }}
              />
              <span
                className="text-sm font-semibold leading-relaxed"
                style={{ color: "hsl(var(--duo-muted))" }}
              >
                {bullet}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // i18next returns the raw key string when a namespace is missing, so the
  // array shape is verified before rendering rather than assumed.
  const raw = t("privacy.sections", { returnObjects: true }) as unknown;
  const sections: PolicySection[] = Array.isArray(raw) ? (raw as PolicySection[]) : [];

  const emailIsPlaceholder = SUPPORT_EMAIL === SUPPORT_EMAIL_PLACEHOLDER;

  return (
    <div className="duo-page min-h-screen bg-background pb-10" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
            aria-label={bi("رجوع", "Back")}
          >
            {isRTL
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {t("privacy.title")}
          </h1>
          <div className="w-11" />
        </div>

        <div className="space-y-4">
          {/* Intro */}
          <div className="duo-card px-4 py-4">
            <p className="font-extrabold text-lg" style={{ color: "hsl(var(--duo-text))" }}>
              {t("privacy.appName")}
            </p>
            <span
              className="inline-block mt-2 mb-3 px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ background: `${ACCENT}1e`, color: ACCENT }}
            >
              {t("privacy.lastUpdated")}
            </span>
            <p
              className="text-sm font-semibold leading-relaxed"
              style={{ color: "hsl(var(--duo-muted))" }}
            >
              {t("privacy.intro")}
            </p>
          </div>

          {sections.map((section, i) => (
            <SectionCard key={i} section={section} />
          ))}

          {/* Contact */}
          <div className="duo-card px-4 py-4">
            <div className="flex items-center gap-3 mb-2.5">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${ACCENT}1e` }}
              >
                <Mail className="w-4 h-4" style={{ color: ACCENT }} strokeWidth={2.5} />
              </span>
              <h2 className="font-extrabold text-base leading-tight" style={{ color: "hsl(var(--duo-text))" }}>
                {splitHeading(t("privacy.contactHeading")).text}
              </h2>
            </div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
              {t("privacy.contactLabel")}:{" "}
              {/* Left as plain text until a real address is set, so the page
                  never renders a mailto: link that goes nowhere. */}
              {emailIsPlaceholder ? (
                <span dir="ltr" className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                  {SUPPORT_EMAIL}
                </span>
              ) : (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  dir="ltr"
                  className="font-bold underline"
                  style={{ color: ACCENT }}
                >
                  {SUPPORT_EMAIL}
                </a>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
