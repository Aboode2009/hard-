import React from "react";

// Hand-drawn flat replacements for badge emojis (nav-icons style).
// Badges are DB rows whose `css_class` holds an emoji; this maps each known
// emoji to a colorful vector icon, with a medallion fallback for unknowns.

const P = {
  gold: "#FFC800",
  goldD: "#E6A700",
  orange: "#FF9600",
  red: "#FF4B4B",
  redD: "#D63333",
  blue: "#1CB0F6",
  blueD: "#0F8ED9",
  green: "#58CC02",
  purple: "#CE82FF",
  white: "#FFFFFF",
  cream: "#FFF3D6",
  brown: "#A56A43",
  skin: "#F5CBA7",
  slate: "#8FA3AD",
};

type Draw = () => React.ReactNode;

const Star = ({ fill, cx = 12, cy = 12, r = 9 }: { fill: string; cx?: number; cy?: number; r?: number }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    return `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} />;
};

const ART: Record<string, Draw> = {
  "🔥": () => (
    <>
      <path d="M12 1.5c1.2 4.5-5.5 6-4.3 11.5A6.8 6.8 0 0019 15c0-3.2-2.1-5.2-3.1-8.2-1.4 1.9-2 2.8-3.3 2.8 1.4-2.6.4-5.4-.6-8.1z" fill={P.orange} />
      <path d="M12 22.5a4.2 4.2 0 004.2-4.2c0-2.6-2.3-3.7-2.7-6.2-1.9 1.7-5.7 3.1-5.7 6.2a4.2 4.2 0 004.2 4.2z" fill={P.gold} />
    </>
  ),
  "⭐": () => <Star fill={P.gold} />,
  "🌟": () => (
    <>
      <Star fill={P.gold} />
      <circle cx="19" cy="5" r="1.4" fill={P.gold} opacity="0.8" />
      <circle cx="4.5" cy="18" r="1" fill={P.gold} opacity="0.7" />
    </>
  ),
  "✨": () => (
    <>
      <Star fill={P.gold} cx={10} cy={13} r={7.5} />
      <Star fill={P.blue} cx={18.5} cy={6} r={3.4} />
    </>
  ),
  "👑": () => (
    <>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 10.5H4.6z" fill={P.gold} />
      <rect x="4" y="17" width="16" height="3.4" rx="1.4" fill={P.goldD} />
      <circle cx="12" cy="13" r="1.6" fill={P.red} />
      <circle cx="7.4" cy="14.4" r="1.2" fill={P.blue} />
      <circle cx="16.6" cy="14.4" r="1.2" fill={P.blue} />
    </>
  ),
  "💎": () => (
    <>
      <path d="M12 3l7.8 5.4L12 21 4.2 8.4z" fill={P.blue} />
      <path d="M12 3l7.8 5.4L12 10.2 4.2 8.4z" fill="#47C2F7" />
      <path d="M4.2 8.4L12 10.2 8 18z" fill={P.blueD} />
      <ellipse cx="9.4" cy="6.6" rx="2" ry="1.1" fill={P.white} opacity="0.55" transform="rotate(-14 9.4 6.6)" />
    </>
  ),
  "🏆": () => (
    <>
      <path d="M7 3.5h10v4.6a5 5 0 01-10 0z" fill={P.gold} />
      <path d="M7 4.6H4.4v1.3a2.8 2.8 0 002.4 2.8M17 4.6h2.6v1.3a2.8 2.8 0 01-2.4 2.8" stroke={P.goldD} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <rect x="10.8" y="12.5" width="2.4" height="3.4" fill={P.goldD} />
      <rect x="8" y="15.8" width="8" height="3.2" rx="1.2" fill={P.orange} />
    </>
  ),
  "🚀": () => (
    <>
      <path d="M12 2c3.4 2 4.6 6 4.6 9.4l-2 4H9.4l-2-4C7.4 8 8.6 4 12 2z" fill={P.cream} />
      <path d="M12 2c3.4 2 4.6 6 4.6 9.4l-1 2H12z" fill="#E8D9B8" />
      <circle cx="12" cy="9" r="2.2" fill={P.blue} />
      <path d="M7.6 11.5L4.6 16l3.4-.6M16.4 11.5l3 4.5-3.4-.6" fill={P.red} />
      <path d="M10 16h4l-2 5.5z" fill={P.orange} />
    </>
  ),
  "⚡": () => <path d="M13.4 2L5.5 13.4h4.6L10.6 22l7.9-11.4h-4.6z" fill={P.gold} />,
  "🌙": () => (
    <>
      <path d="M15 2.5A9.5 9.5 0 1021.5 15 7.6 7.6 0 0115 2.5z" fill={P.gold} />
      <circle cx="18.5" cy="5.5" r="1.1" fill={P.gold} opacity="0.7" />
    </>
  ),
  "❤": () => (
    <>
      <path d="M12 21S3 14.8 3 8.8A4.8 4.8 0 0112 6a4.8 4.8 0 019 2.8c0 6-9 12.2-9 12.2z" fill={P.red} />
      <ellipse cx="8.4" cy="9" rx="1.8" ry="1.1" fill={P.white} opacity="0.4" transform="rotate(-20 8.4 9)" />
    </>
  ),
  "💪": () => (
    <>
      <path d="M5 20c0-6 2-11 5-13l3 2c-2 2-3 5-3 8z" fill={P.blue} />
      <path d="M10 17c0-3.4 2.6-6 6-6a5 5 0 015 5c0 2.8-2.2 5-5 5h-6z" fill={P.skin} />
      <circle cx="16.4" cy="15.6" r="2.4" fill="#E8B48C" />
    </>
  ),
  "🏅": () => (
    <>
      <path d="M8.5 2h3l-2 6.5L6 7z" fill={P.blue} />
      <path d="M15.5 2h-3l2 6.5L18 7z" fill={P.red} />
      <circle cx="12" cy="14.6" r="6.6" fill={P.gold} />
      <circle cx="12" cy="14.6" r="4.6" fill={P.goldD} />
      <Star fill={P.white} cx={12} cy={14.6} r={3.4} />
    </>
  ),
  "🛡": () => (
    <>
      <path d="M12 2l8 3v6.6c0 5-3.3 8-8 9.9-4.7-1.9-8-4.9-8-9.9V5z" fill={P.blue} />
      <path d="M12 2l8 3v6.6c0 5-3.3 8-8 9.9z" fill={P.blueD} opacity="0.5" />
      <path d="M8.4 12l2.5 2.5 4.7-5" stroke={P.white} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  "☀": () => (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="11" y="1" width="2" height="4" rx="1" fill={P.gold} transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="5.4" fill={P.gold} />
      <circle cx="10.4" cy="10.4" r="1.6" fill={P.white} opacity="0.5" />
    </>
  ),
  "📚": () => (
    <>
      <rect x="3" y="4" width="8.4" height="16" rx="1.6" fill={P.red} />
      <rect x="12.6" y="4" width="8.4" height="16" rx="1.6" fill={P.green} />
      <rect x="5" y="7" width="4.4" height="1.8" rx="0.9" fill={P.white} opacity="0.7" />
      <rect x="14.6" y="7" width="4.4" height="1.8" rx="0.9" fill={P.white} opacity="0.7" />
    </>
  ),
  "📖": () => (
    <>
      <path d="M12 5C10 3.8 7 3.4 3.5 3.8v14c3.5-.4 6.5 0 8.5 1.2 2-1.2 5-1.6 8.5-1.2v-14C17 3.4 14 3.8 12 5z" fill={P.cream} />
      <path d="M12 5v14" stroke="#D8C8A6" strokeWidth="1.6" />
      <path d="M6 8h4M6 11h4M14 8h4M14 11h4" stroke="#C9BBA0" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  "🎯": () => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={P.red} />
      <circle cx="12" cy="12" r="6.3" fill={P.white} />
      <circle cx="12" cy="12" r="3.2" fill={P.red} />
      <circle cx="12" cy="12" r="1.2" fill={P.white} />
    </>
  ),
  "❄": () => (
    <>
      <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke={P.blue} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.2" fill={P.white} />
    </>
  ),
  "🌱": () => (
    <>
      <path d="M12 21v-8" stroke={P.green} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 13C12 8 8.5 5.5 4 5.5 4 10 7.5 13 12 13z" fill={P.green} />
      <path d="M12 13c0-4 2.8-6 6.5-6 0 3.6-2.8 6-6.5 6z" fill="#78D630" />
    </>
  ),
};

const Fallback: Draw = () => (
  <>
    <circle cx="12" cy="12" r="9.5" fill={P.gold} />
    <circle cx="12" cy="12" r="7" fill={P.goldD} />
    <Star fill={P.white} cx={12} cy={12} r={5} />
  </>
);

interface BadgeArtProps {
  badge?: string | null;
  className?: string;
}

export const BadgeArt = ({ badge, className }: BadgeArtProps) => {
  // Normalize: strip variation selectors / ZWJ so "❤️" matches "❤"
  const key = (badge || "").replace(/[️‍]/g, "").trim();
  const draw = ART[key] || Fallback;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {draw()}
    </svg>
  );
};
