import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// ─── SPORT / DUMBBELL ────────────────────────────────────────────
export const DuoDumbbell = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    {/* Base shadow */}
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#0f7ac0" />
    {/* Main bg */}
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#1cb0f6" />
    {/* Highlight */}
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#47c2f7" opacity="0.5" />
    {/* Bar */}
    <rect x="24" y="36" width="32" height="8" rx="4" fill="#fff" />
    {/* Left weight */}
    <rect x="12" y="28" width="14" height="24" rx="5" fill="#fff" />
    <rect x="16" y="24" width="6" height="32" rx="3" fill="#fff" />
    {/* Right weight */}
    <rect x="54" y="28" width="14" height="24" rx="5" fill="#fff" />
    <rect x="58" y="24" width="6" height="32" rx="3" fill="#fff" />
  </svg>
);

// ─── SLEEP / MOON ────────────────────────────────────────────────
export const DuoMoon = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#8a48b8" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#ce82ff" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#da9eff" opacity="0.5" />
    {/* Moon crescent */}
    <path d="M48 18C36 18 26 28 26 42S36 66 48 66C34 62 24 52 24 40S34 20 48 18Z" fill="#fff" />
    {/* Stars */}
    <circle cx="56" cy="24" r="3" fill="#fff" />
    <circle cx="62" cy="36" r="2" fill="#fff" opacity="0.7" />
    <circle cx="52" cy="50" r="2.5" fill="#fff" opacity="0.6" />
    <path d="M64 46L65.5 43L67 46L70 47.5L67 49L65.5 52L64 49L61 47.5Z" fill="#ffc800" />
  </svg>
);

// ─── WATER / DROPLET ─────────────────────────────────────────────
export const DuoWater = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#1562a6" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#2b70c9" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#4a8ad4" opacity="0.5" />
    {/* Drop body */}
    <path d="M40 14L24 42C24 54 31 64 40 64S56 54 56 42L40 14Z" fill="#1cb0f6" />
    {/* Drop highlight */}
    <path d="M40 18L30 38C30 46 34 54 40 54" fill="#47c2f7" opacity="0.6" />
    {/* Shine */}
    <ellipse cx="34" cy="44" rx="4" ry="6" fill="#fff" opacity="0.5" transform="rotate(-15 34 44)" />
  </svg>
);

// ─── READING / BOOK ──────────────────────────────────────────────
export const DuoBook = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#cc7800" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#ff9600" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#ffad33" opacity="0.5" />
    {/* Book cover */}
    <rect x="18" y="20" width="44" height="40" rx="4" fill="#fff" />
    {/* Spine */}
    <rect x="38" y="20" width="4" height="40" fill="#e8e8e8" />
    {/* Left lines */}
    <rect x="22" y="30" width="12" height="3" rx="1.5" fill="#ddd" />
    <rect x="22" y="36" width="10" height="3" rx="1.5" fill="#ddd" />
    <rect x="22" y="42" width="12" height="3" rx="1.5" fill="#ddd" />
    {/* Right lines */}
    <rect x="46" y="30" width="12" height="3" rx="1.5" fill="#ddd" />
    <rect x="46" y="36" width="10" height="3" rx="1.5" fill="#ddd" />
    <rect x="46" y="42" width="12" height="3" rx="1.5" fill="#ddd" />
    {/* Bookmark */}
    <path d="M54 20V32L58 28L62 32V20Z" fill="#ff4b4b" />
  </svg>
);

// ─── NO SUGAR / HEALTHY FOOD ─────────────────────────────────────
export const DuoSalad = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#3d8a00" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#58cc02" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#78d630" opacity="0.5" />
    {/* Apple body */}
    <ellipse cx="40" cy="44" rx="16" ry="18" fill="#fff" />
    {/* Leaf */}
    <path d="M40 26C40 26 44 18 52 18C52 26 44 28 40 26Z" fill="#89e219" />
    <path d="M40 26C40 26 36 20 30 22" stroke="#89e219" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Stem */}
    <rect x="39" y="22" width="3" height="8" rx="1.5" fill="#8B4513" />
    {/* Shine */}
    <ellipse cx="34" cy="38" rx="4" ry="6" fill="#fff" opacity="0.4" transform="rotate(-10 34 38)" />
    {/* Cross (no sugar) */}
    <circle cx="54" cy="56" r="8" fill="#ff4b4b" />
    <rect x="49" y="54.5" width="10" height="3" rx="1.5" fill="#fff" transform="rotate(45 54 56)" />
    <rect x="49" y="54.5" width="10" height="3" rx="1.5" fill="#fff" transform="rotate(-45 54 56)" />
  </svg>
);

// ─── PHOTO / CAMERA ──────────────────────────────────────────────
export const DuoCamera = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#c93a3a" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#ff4b4b" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#ff7070" opacity="0.5" />
    {/* Camera body */}
    <rect x="16" y="32" width="48" height="32" rx="6" fill="#fff" />
    {/* Camera top bump */}
    <rect x="30" y="24" width="20" height="12" rx="4" fill="#fff" />
    {/* Lens outer ring */}
    <circle cx="40" cy="48" r="12" fill="#e8e8e8" />
    {/* Lens inner */}
    <circle cx="40" cy="48" r="8" fill="#1cb0f6" />
    {/* Lens shine */}
    <circle cx="37" cy="45" r="3" fill="#fff" opacity="0.6" />
    {/* Flash */}
    <circle cx="56" cy="38" r="3" fill="#ffc800" />
  </svg>
);

// ─── COLD SHOWER / SNOWFLAKE ─────────────────────────────────────
export const DuoSnowflake = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#0f7ac0" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#1cb0f6" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#47c2f7" opacity="0.5" />
    {/* Snowflake center */}
    <circle cx="40" cy="40" r="4" fill="#fff" />
    {/* Main axes */}
    <rect x="38" y="18" width="4" height="44" rx="2" fill="#fff" />
    <rect x="18" y="38" width="44" height="4" rx="2" fill="#fff" />
    {/* Diagonal axes */}
    <rect x="38" y="18" width="4" height="44" rx="2" fill="#fff" transform="rotate(45 40 40)" />
    <rect x="38" y="18" width="4" height="44" rx="2" fill="#fff" transform="rotate(-45 40 40)" />
    {/* Branch tips */}
    <circle cx="40" cy="18" r="3" fill="#fff" />
    <circle cx="40" cy="62" r="3" fill="#fff" />
    <circle cx="18" cy="40" r="3" fill="#fff" />
    <circle cx="62" cy="40" r="3" fill="#fff" />
  </svg>
);

// ─── DAILY TASK / CHECKLIST ──────────────────────────────────────
export const DuoChecklist = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#8a48b8" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#ce82ff" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#da9eff" opacity="0.5" />
    {/* Clipboard */}
    <rect x="20" y="22" width="40" height="44" rx="5" fill="#fff" />
    {/* Clipboard clip */}
    <rect x="32" y="18" width="16" height="10" rx="4" fill="#e8e8e8" />
    <rect x="36" y="16" width="8" height="6" rx="3" fill="#ce82ff" />
    {/* Check 1 */}
    <rect x="26" y="34" width="8" height="8" rx="2" fill="#58cc02" />
    <path d="M28 38L30 40L34 36" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="38" y="36" width="16" height="3" rx="1.5" fill="#ddd" />
    {/* Check 2 */}
    <rect x="26" y="46" width="8" height="8" rx="2" fill="#58cc02" />
    <path d="M28 50L30 52L34 48" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="38" y="48" width="12" height="3" rx="1.5" fill="#ddd" />
    {/* Unchecked 3 */}
    <rect x="26" y="58" width="8" height="8" rx="2" fill="#e8e8e8" />
    <rect x="38" y="60" width="14" height="3" rx="1.5" fill="#eee" />
  </svg>
);

// ─── COMMUNITY SERVICE / USERS ───────────────────────────────────
export const DuoUsers = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#cc7800" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#ff9600" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#ffad33" opacity="0.5" />
    {/* Person 1 (front) */}
    <circle cx="34" cy="32" r="10" fill="#fff" />
    <path d="M18 62C18 50 25 44 34 44S50 50 50 62" fill="#fff" />
    {/* Person 2 (back) */}
    <circle cx="50" cy="28" r="8" fill="#ffebc8" />
    <path d="M38 58C38 48 43 42 50 42S62 48 62 58" fill="#ffebc8" />
    {/* Heart */}
    <path d="M40 56L37 53C34 50 34 47 37 46S42 46 40 50C38 46 41 45 43 46S46 50 43 53Z" fill="#ff4b4b" />
  </svg>
);

// ─── TALK TO STRANGER / CHAT ─────────────────────────────────────
export const DuoChat = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#0f7ac0" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#1cb0f6" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#47c2f7" opacity="0.5" />
    {/* Chat bubble */}
    <rect x="16" y="22" width="40" height="28" rx="10" fill="#fff" />
    <path d="M28 50L20 60L34 50Z" fill="#fff" />
    {/* Dots */}
    <circle cx="28" cy="36" r="3.5" fill="#1cb0f6" />
    <circle cx="38" cy="36" r="3.5" fill="#1cb0f6" />
    <circle cx="48" cy="36" r="3.5" fill="#1cb0f6" />
    {/* Small bubble */}
    <rect x="44" y="40" width="24" height="16" rx="8" fill="#e8f7ff" />
    <circle cx="52" cy="48" r="2" fill="#1cb0f6" opacity="0.5" />
    <circle cx="58" cy="48" r="2" fill="#1cb0f6" opacity="0.5" />
    <circle cx="64" cy="48" r="2" fill="#1cb0f6" opacity="0.5" />
  </svg>
);

// ─── MAKE DAWA / MEGAPHONE ───────────────────────────────────────
export const DuoMegaphone = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#c93a3a" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#ff4b4b" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#ff7070" opacity="0.5" />
    {/* Megaphone body */}
    <path d="M22 36L50 22V58L22 44Z" fill="#fff" />
    {/* Megaphone handle */}
    <rect x="14" y="34" width="10" height="12" rx="4" fill="#ffc800" />
    {/* Sound waves */}
    <path d="M54 30C58 34 58 46 54 50" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M60 24C66 30 66 50 60 56" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
    {/* Stand */}
    <rect x="26" y="44" width="4" height="16" rx="2" fill="#ffc800" />
    <rect x="20" y="58" width="16" height="4" rx="2" fill="#ffc800" />
  </svg>
);

// ─── CUSTOM TASK / STAR ──────────────────────────────────────────
export const DuoStar = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    <rect x="4" y="8" width="72" height="68" rx="16" fill="#cca000" />
    <rect x="4" y="4" width="72" height="68" rx="16" fill="#ffc800" />
    <rect x="8" y="8" width="64" height="32" rx="12" fill="#ffd633" opacity="0.5" />
    {/* Star */}
    <path d="M40 16L46 32L64 34L50 46L54 64L40 54L26 64L30 46L16 34L34 32Z" fill="#fff" />
    {/* Inner star shine */}
    <path d="M40 22L44 32L54 33L47 40L49 50L40 44" fill="#ffefc8" opacity="0.5" />
  </svg>
);

// ─── STREAK FREEZE / ICE CRYSTAL (standalone, no tile) ───────────
export const DuoFreeze = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    {/* Jagged ice block */}
    <path
      d="M40 4L60 12L70 32L66 54L50 70L34 74L18 62L10 38L16 16Z"
      fill="#B9E8FF"
    />
    {/* Right-side facet shading */}
    <path d="M40 4L60 12L70 32L66 54L50 70L46 40Z" fill="#8FD6FA" opacity="0.65" />
    {/* Bottom drip */}
    <path d="M30 72L34 74L32 79Z" fill="#B9E8FF" />
    {/* Inner droplet */}
    <path
      d="M41 22C41 22 26 40 26 51C26 59.5 32.5 66 41 66C49.5 66 56 59.5 56 51C56 40 41 22 41 22Z"
      fill="#1CB0F6"
    />
    <path d="M41 22C41 22 26 40 26 51C26 59.5 32.5 66 41 66V22Z" fill="#0F8ED9" opacity="0.45" />
    {/* Droplet shine */}
    <ellipse cx="35" cy="51" rx="3.5" ry="5.5" fill="#fff" opacity="0.75" transform="rotate(-14 35 51)" />
    {/* Sparkle */}
    <path d="M60 22L61.8 17.8L63.6 22L67.8 23.8L63.6 25.6L61.8 29.8L60 25.6L55.8 23.8Z" fill="#fff" />
  </svg>
);

// ─── GEM / CURRENCY (Duolingo-style blue gem) ────────────────────
export const DuoGem = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 80 80" className={cn("w-full h-full", className)} fill="none" {...props}>
    {/* Gem body */}
    <path d="M40 6L68 24L60 68L20 68L12 24Z" fill="#1CB0F6" />
    {/* Top facet */}
    <path d="M40 6L68 24L40 34L12 24Z" fill="#47C2F7" />
    {/* Left dark facet */}
    <path d="M12 24L40 34L20 68Z" fill="#0F7AC0" />
    {/* Shine */}
    <ellipse cx="33" cy="22" rx="7" ry="4" fill="#fff" opacity="0.55" transform="rotate(-12 33 22)" />
    <circle cx="48" cy="48" r="3" fill="#fff" opacity="0.35" />
  </svg>
);

// ─── THICK CHECKMARK (for swipe & completion) ────────────────────
export const DuoThickCheck = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} fill="none" {...props}>
    <path 
      d="M20 52L40 72L80 28" 
      stroke="currentColor" 
      strokeWidth="14" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

// ─── THICK UNDO (for swipe undo) ─────────────────────────────────
export const DuoThickUndo = ({ className, ...props }: IconProps) => (
  <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} fill="none" {...props}>
    <path 
      d="M38 30L18 50L38 70" 
      stroke="currentColor" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path 
      d="M22 50H60C72 50 80 58 80 70V75" 
      stroke="currentColor" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);
