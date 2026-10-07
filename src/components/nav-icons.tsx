// Colorful, flat Duolingo-style navigation icons (custom SVGs — no emoji).
// Each icon uses fixed vivid fills so it reads clearly in light & dark mode.

interface IconProps {
  className?: string;
}

const C = {
  red: "#FF4B4B",
  redDark: "#E5383B",
  gold: "#FFC800",
  goldDark: "#E6A700",
  green: "#58CC02",
  blue: "#1CB0F6",
  orange: "#FF9600",
  purple: "#CE82FF",
  purpleDark: "#A560D9",
  cream: "#FFF3D6",
  brown: "#A56A43",
  brownDark: "#7C4D2E",
  slate: "#8FA3AD",
  white: "#FFFFFF",
};

/** Home / daily tasks — a cozy house with a red roof. */
export const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 11.5 12 5.5l7 6v7.2a1.3 1.3 0 0 1-1.3 1.3H6.3A1.3 1.3 0 0 1 5 18.7Z" fill={C.gold} />
    <path d="M3.2 12.2 12 4.4l8.8 7.8a1 1 0 0 1-.66 1.75H3.86A1 1 0 0 1 3.2 12.2Z" fill={C.red} />
    <rect x="10" y="14.2" width="4" height="5" rx="0.8" fill={C.brownDark} />
  </svg>
);

/** Overall / statistics — a colorful bar chart. */
export const StatsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3.5" y="13" width="4.3" height="7.5" rx="1.6" fill={C.blue} />
    <rect x="9.85" y="8.5" width="4.3" height="12" rx="1.6" fill={C.green} />
    <rect x="16.2" y="4.5" width="4.3" height="16" rx="1.6" fill={C.gold} />
  </svg>
);

/** Store — a shop front with a striped awning. */
export const StoreIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="1.6" fill={C.cream} />
    <rect x="10.2" y="14" width="3.6" height="6.5" rx="0.7" fill={C.orange} />
    <path d="M3 6.5h18l-1 4.2a1 1 0 0 1-1 .8H5a1 1 0 0 1-1-.8Z" fill={C.red} />
    <path d="M7.5 6.5 7 11.5M12 6.5v5M16.5 6.5l.5 5" stroke={C.white} strokeWidth="1.1" />
  </svg>
);

/** Profile / account — a friendly avatar. */
export const ProfileIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill={C.purple} />
    <circle cx="12" cy="10" r="3.4" fill={C.white} />
    <path d="M5.6 19.2a6.6 6.6 0 0 1 12.8 0A9 9 0 0 1 5.6 19.2Z" fill={C.white} />
  </svg>
);

/** Settings — a chunky gear. */
export const SettingsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 2.6l1.7 1.7 2.3-.6.9 2.2 2.3.6-.3 2.4 1.7 1.7-1.7 1.7.3 2.4-2.3.6-.9 2.2-2.3-.6L12 21.4l-1.7-1.7-2.3.6-.9-2.2-2.3-.6.3-2.4L3.4 12l1.7-1.7-.3-2.4 2.3-.6.9-2.2 2.3.6Z"
      fill={C.slate}
    />
    <circle cx="12" cy="12" r="3.5" fill={C.blue} />
  </svg>
);

/** NASS challenge — a target / bullseye. */
export const TargetIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill={C.orange} />
    <circle cx="12" cy="12" r="5.6" fill={C.cream} />
    <circle cx="12" cy="12" r="2.6" fill={C.red} />
  </svg>
);

/** Leaderboard — a gold trophy. */
export const TrophyIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6.5 4h11v4.2a5.5 5.5 0 0 1-11 0Z" fill={C.gold} />
    <path d="M6.5 5.2H4.2v1.4a3 3 0 0 0 2.6 3M17.5 5.2h2.3v1.4a3 3 0 0 1-2.6 3" stroke={C.goldDark} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <rect x="10.7" y="13" width="2.6" height="3.6" fill={C.goldDark} />
    <rect x="7.8" y="16.4" width="8.4" height="3.4" rx="1.2" fill={C.orange} />
  </svg>
);

/* ===== Settings page icons (same flat colorful style) ===== */

/** Language — a blue globe. */
export const GlobeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill={C.blue} />
    <ellipse cx="12" cy="12" rx="4" ry="9" stroke={C.white} strokeWidth="1.6" fill="none" />
    <path d="M3.4 12h17.2M4.6 7.5h14.8M4.6 16.5h14.8" stroke={C.white} strokeWidth="1.6" />
  </svg>
);

/** Theme — sun and moon. */
export const ThemeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="8" y="1.5" width="2" height="3.4" rx="1" fill={C.gold} transform={`rotate(${a} 9 10)`} />
      ))}
    </g>
    <circle cx="9" cy="10" r="5" fill={C.gold} />
    <path d="M16.5 8a6.5 6.5 0 100 13c1.9 0 3.6-.8 4.8-2.1-4.2-.3-7.4-3.9-6.7-8.2.2-1 .6-1.9 1.9-2.7z" fill={C.purple} />
  </svg>
);

/** Theme store — a painter's palette. */
export const PaletteIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 3a9 9 0 100 18c1.9 0 2.3-1.2 1.6-2.3-.8-1.4.2-2.7 1.9-2.7H18a4 4 0 004-4c0-5.2-4.5-9-10-9z"
      fill="#E5A55D"
    />
    <circle cx="7.6" cy="9.2" r="1.7" fill={C.red} />
    <circle cx="12" cy="6.8" r="1.7" fill={C.blue} />
    <circle cx="16.4" cy="9.2" r="1.7" fill={C.green} />
    <circle cx="6.8" cy="13.8" r="1.7" fill={C.gold} />
  </svg>
);

/** Calendar — red header, pins, date dots. */
export const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="17" rx="3" fill={C.cream} />
    <path d="M3 7.5a3 3 0 013-3h12a3 3 0 013 3V10H3z" fill={C.red} />
    <rect x="6.8" y="2.5" width="2.6" height="4.4" rx="1.3" fill={C.goldDark} />
    <rect x="14.6" y="2.5" width="2.6" height="4.4" rx="1.3" fill={C.goldDark} />
    {[0, 1, 2].map((r) =>
      [0, 1, 2, 3].map((c) => (
        <circle key={`${r}${c}`} cx={7 + c * 3.4} cy={13 + r * 3} r="1" fill={r === 1 && c === 2 ? C.green : "#C9BBA0"} />
      ))
    )}
  </svg>
);

/** Rewards — a gift box. */
export const GiftIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="10.5" width="16" height="11" rx="2" fill={C.red} />
    <rect x="2.8" y="6.5" width="18.4" height="5" rx="2" fill={C.redDark} />
    <rect x="10.6" y="6.5" width="2.8" height="15" fill={C.gold} />
    <circle cx="9" cy="5.5" r="2.4" fill={C.gold} />
    <circle cx="15" cy="5.5" r="2.4" fill={C.gold} />
    <circle cx="12" cy="6.6" r="1.5" fill={C.goldDark} />
  </svg>
);

/** Achievements — a medal with ribbons. */
export const MedalIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M8 2h4l-2.6 7L5 7.5z" fill={C.blue} />
    <path d="M16 2h-4l2.6 7L19 7.5z" fill={C.red} />
    <circle cx="12" cy="14.5" r="6.5" fill={C.gold} />
    <circle cx="12" cy="14.5" r="4.6" fill={C.goldDark} />
    <path d="M12 11.4l1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3z" fill={C.white} />
  </svg>
);

/** Paths — a winding trail with a flag. */
export const TrailIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 20c6 0 6-5.5 1.5-6.5C2.8 12.6 5 7 10 7h6" stroke={C.slate} strokeWidth="2.6" strokeLinecap="round" fill="none" strokeDasharray="0.1 4.4" />
    <circle cx="5" cy="20" r="2.4" fill={C.green} />
    <rect x="16.6" y="2.5" width="1.9" height="10" rx="0.95" fill={C.brown} />
    <path d="M18.5 3h4.3l-1.5 2 1.5 2h-4.3z" fill={C.red} />
  </svg>
);

/** Add task — a notepad with a plus. */
export const AddTaskIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="3.5" width="14" height="18" rx="3" fill={C.cream} />
    <rect x="7" y="8" width="8" height="1.8" rx="0.9" fill="#C9BBA0" />
    <rect x="7" y="11.6" width="6" height="1.8" rx="0.9" fill="#C9BBA0" />
    <circle cx="17" cy="17" r="5" fill={C.green} />
    <path d="M17 14.6v4.8M14.6 17h4.8" stroke={C.white} strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

/** Gallery — a photo with hills and sun. */
export const GalleryIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="15" rx="3" fill="#9ADCF9" />
    <circle cx="16.4" cy="9" r="2" fill={C.gold} />
    <path d="M3 16l4.6-5 4.4 4.5 3-2.8L21 17v.5a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={C.green} />
    <rect x="3" y="4.5" width="18" height="15" rx="3" stroke={C.white} strokeWidth="1.8" fill="none" />
  </svg>
);

/** Reminders — a golden bell. */
export const BellIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 3a6.5 6.5 0 00-6.5 6.5c0 4-1.6 5.4-2.3 6.3-.4.5 0 1.2.7 1.2h16.2c.7 0 1.1-.7.7-1.2-.7-.9-2.3-2.3-2.3-6.3A6.5 6.5 0 0012 3z" fill={C.gold} />
    <path d="M3.9 15.8h16.2c.7 0 1.1-.7.7-1.2l-.4-.5H3.6l-.4.5c-.4.5 0 1.2.7 1.2z" fill={C.goldDark} />
    <rect x="10.9" y="1.6" width="2.2" height="2.6" rx="1.1" fill={C.brown} />
    <circle cx="12" cy="19.5" r="2.2" fill={C.brown} />
  </svg>
);

/** Company code — an office building. */
export const BuildingIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="3" width="14" height="19" rx="2" fill={C.blue} />
    <rect x="5" y="3" width="14" height="4" rx="2" fill="#0F7AC0" />
    {[0, 1, 2].map((r) =>
      [0, 1].map((c) => (
        <rect key={`${r}${c}`} x={8 + c * 5.4} y={9 + r * 3.4} width="2.7" height="2.2" rx="0.6" fill={r === 0 && c === 1 ? C.gold : C.white} />
      ))
    )}
    <rect x="10.4" y="17.6" width="3.2" height="4.4" rx="1" fill={C.cream} />
  </svg>
);

/** Password — a golden key. */
export const KeyIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="8" cy="9" r="5.5" fill={C.gold} />
    <circle cx="8" cy="9" r="2.3" fill={C.goldDark} />
    <path d="M12 12.5L19.5 20M17 17.5l2.6-2.6M14.6 15.1l2.2-2.2" stroke={C.gold} strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

/** Admin — a purple shield with a check. */
export const AdminShieldIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 2l8 3v7c0 5.2-3.4 8.3-8 10-4.6-1.7-8-4.8-8-10V5z" fill={C.purple} />
    <path d="M12 2l8 3v7c0 5.2-3.4 8.3-8 10z" fill={C.purpleDark} opacity="0.55" />
    <path d="M8.2 12.2l2.6 2.6 5-5.2" stroke={C.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/** Backups — a database stack. */
export const DatabaseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <ellipse cx="12" cy="5.5" rx="8" ry="3.2" fill={C.blue} />
    <path d="M4 5.5v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-6" fill="#0F7AC0" />
    <path d="M4 11.5v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-6" fill="#0C639C" />
    <ellipse cx="12" cy="5.5" rx="8" ry="3.2" fill={C.blue} />
    <ellipse cx="12" cy="5" rx="5.5" ry="1.8" fill="#47C2F7" opacity="0.6" />
  </svg>
);

/** Delete account — a red trash can. */
export const TrashIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5.5 8h13l-1 12a2.5 2.5 0 01-2.5 2H9a2.5 2.5 0 01-2.5-2z" fill={C.red} />
    <rect x="4" y="4.6" width="16" height="3" rx="1.5" fill={C.redDark} />
    <rect x="9.4" y="2.6" width="5.2" height="2.6" rx="1.3" fill={C.redDark} />
    <path d="M9.6 10.8v7.4M12 10.8v7.4M14.4 10.8v7.4" stroke={C.white} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
  </svg>
);

/** Rewards — a treasure chest. */
export const ChestIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3.8" y="11" width="16.4" height="8.4" rx="1.8" fill={C.brown} />
    <path d="M3.8 11.2a8.2 5.4 0 0 1 16.4 0v1.2H3.8Z" fill={C.gold} />
    <rect x="3.8" y="12.2" width="16.4" height="2.4" fill={C.goldDark} />
    <rect x="10.7" y="12" width="2.6" height="4.4" rx="0.6" fill={C.cream} />
    <circle cx="12" cy="13.4" r="1.1" fill={C.brownDark} />
  </svg>
);

/** Privacy policy — a blue shield with a padlock. */
export const PrivacyIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 2l8 3v7c0 5.2-3.4 8.3-8 10-4.6-1.7-8-4.8-8-10V5z" fill={C.blue} />
    <path d="M12 2l8 3v7c0 5.2-3.4 8.3-8 10z" fill="#0F7AC0" opacity="0.55" />
    <path d="M9.9 10.6V9.3a2.1 2.1 0 0 1 4.2 0v1.3" stroke={C.white} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <rect x="8.8" y="10.5" width="6.4" height="5.3" rx="1.3" fill={C.white} />
  </svg>
);
