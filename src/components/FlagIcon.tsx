import React from "react";

// Hand-drawn flat flags (Duolingo-style rounded tiles) for the language
// picker — replaces the flag emojis.

const Star = ({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    return `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} />;
};

const FLAGS: Record<string, React.ReactNode> = {
  // Arabic — Duolingo-style green tile with crescent & star
  ar: (
    <>
      <rect x="0" y="0" width="40" height="30" fill="#58CC02" />
      <circle cx="18" cy="15" r="8" fill="#FFFFFF" />
      <circle cx="20.5" cy="15" r="6.6" fill="#58CC02" />
      <Star cx={25} cy={15} r={3.2} fill="#FFFFFF" />
    </>
  ),
  // English — simplified US flag
  en: (
    <>
      <rect x="0" y="0" width="40" height="30" fill="#F7F7F5" />
      {[4.5, 11.5, 18.5, 25.5].map((y) => (
        <rect key={y} x="0" y={y} width="40" height="3.6" fill="#FF4B4B" />
      ))}
      <rect x="0" y="0" width="19" height="15" fill="#1CB0F6" />
      <Star cx={5.5} cy={7.5} r={2.2} fill="#FFFFFF" />
      <Star cx={11} cy={7.5} r={2.2} fill="#FFFFFF" />
      <Star cx={16.5} cy={7.5} r={2.2} fill="#FFFFFF" />
    </>
  ),
  // Turkish — red with crescent & star
  tr: (
    <>
      <rect x="0" y="0" width="40" height="30" fill="#FF4B4B" />
      <circle cx="15" cy="15" r="7.5" fill="#FFFFFF" />
      <circle cx="17" cy="15" r="6" fill="#FF4B4B" />
      <Star cx={25.5} cy={15} r={3.4} fill="#FFFFFF" />
    </>
  ),
  // Spanish — red/gold bands
  es: (
    <>
      <rect x="0" y="0" width="40" height="30" fill="#FFC800" />
      <rect x="0" y="0" width="40" height="8" fill="#FF4B4B" />
      <rect x="0" y="22" width="40" height="8" fill="#FF4B4B" />
      <rect x="9" y="12" width="5" height="7" rx="1.5" fill="#E5484D" />
    </>
  ),
  // Chinese — red with gold stars
  zh: (
    <>
      <rect x="0" y="0" width="40" height="30" fill="#FF4B4B" />
      <Star cx={11} cy={12} r={5} fill="#FFC800" />
      <Star cx={20} cy={6} r={1.8} fill="#FFC800" />
      <Star cx={23} cy={11} r={1.8} fill="#FFC800" />
      <Star cx={23} cy={17} r={1.8} fill="#FFC800" />
      <Star cx={20} cy={22} r={1.8} fill="#FFC800" />
    </>
  ),
  // Japanese — white with red sun
  ja: (
    <>
      <rect x="0" y="0" width="40" height="30" fill="#F7F7F5" />
      <circle cx="20" cy="15" r="7.5" fill="#FF4B4B" />
    </>
  ),
};

interface FlagIconProps {
  code: string;
  className?: string;
}

export const FlagIcon = ({ code, className }: FlagIconProps) => {
  const clipId = `flag-clip-${code}`;
  return (
    <svg viewBox="0 0 40 30" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="1" y="1" width="38" height="28" rx="6.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{FLAGS[code] || FLAGS.en}</g>
      <rect
        x="1"
        y="1"
        width="38"
        height="28"
        rx="6.5"
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="2"
      />
    </svg>
  );
};
