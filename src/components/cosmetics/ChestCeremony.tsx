import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeArt } from "./BadgeArt";
import { Award, Frame, Palette, Star } from "lucide-react";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { CosmeticRarity, RARITY_TEXT_COLORS, RARITY_LABELS } from "./types";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import confetti from "canvas-confetti";

/**
 * The one chest screen of the app.
 *
 * Every chest — the store's treasure chest, the level-up chest, the badge loot
 * box and the weekly boss chest — opens through this component, so they all
 * look and behave the same: a full-screen dark stage, the same chest bobbing
 * over a gold glow, one tap to open, a shake, golden rays, and one reward card
 * with a green CONTINUE button. Each caller only supplies its title and its
 * reward.
 */

/** A cosmetic as the reward card needs it. Boss chests send a lighter row
 *  (no rarity, no badge art), hence the optional fields. */
export interface ChestItem {
  name: string;
  name_ar: string;
  type: string;
  rarity?: CosmeticRarity;
  css_class?: string;
}

export interface ChestReward {
  /** Points; shown big at the top of the card. */
  coins?: number;
  xp?: number;
  item?: ChestItem | null;
}

interface ChestCeremonyProps {
  isOpen: boolean;
  /** Big white heading above the chest. */
  title: string;
  /** Small gold line above the title ("LEVEL UP"). */
  kicker?: string;
  /**
   * The reward to reveal. May arrive after the tap (`onOpen` fetches it); the
   * chest keeps shaking until it is here.
   */
  reward: ChestReward | null;
  /**
   * Called on the tap. If it rejects, the chest goes back to waiting for a tap
   * (the caller reports the error).
   */
  onOpen?: () => unknown;
  /** Played once when the screen appears (the level-up fanfare). */
  introSound?: string;
  onClose: () => void;
}

const SOUNDS = {
  boxShake: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  reveal: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  epic: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3",
  legendary: "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3",
};

/** How long the chest shakes before it opens, at the least. */
const SHAKE_MS = 1400;

const GOLD = "#FFC800";

const RARITY_BORDERS: Record<string, string> = {
  common: "#8FA3AD",
  rare: "#1CB0F6",
  epic: "#CE82FF",
  legendary: "#FFC800",
};

// Rotating golden rays shown behind the opened chest (Duolingo-style burst)
export const RAYS =
  "conic-gradient(rgba(255,200,0,.35) 0 20deg, transparent 20deg 45deg," +
  "rgba(255,200,0,.35) 45deg 65deg, transparent 65deg 90deg," +
  "rgba(255,200,0,.35) 90deg 110deg, transparent 110deg 135deg," +
  "rgba(255,200,0,.35) 135deg 155deg, transparent 155deg 180deg," +
  "rgba(255,200,0,.35) 180deg 200deg, transparent 200deg 225deg," +
  "rgba(255,200,0,.35) 225deg 245deg, transparent 245deg 270deg," +
  "rgba(255,200,0,.35) 270deg 290deg, transparent 290deg 315deg," +
  "rgba(255,200,0,.35) 315deg 335deg, transparent 335deg 360deg)";

/** Flat Duolingo-style treasure chest with a lid that actually swings open. */
export const Chest = ({ open, shaking }: { open: boolean; shaking: boolean }) => (
  <motion.div
    animate={
      shaking
        ? { rotate: [0, -6, 6, -6, 6, 0], x: [0, -4, 4, -4, 4, 0] }
        : open
        ? {}
        : { y: [0, -10, 0] }
    }
    transition={
      shaking
        ? { duration: 0.35, repeat: Infinity }
        : open
        ? {}
        : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
    }
    className="w-52 h-44"
  >
    <svg viewBox="0 0 200 170" className="w-full h-full overflow-visible">
      {/* Inner glow spilling out when opened */}
      {open && (
        <motion.ellipse
          cx="100"
          cy="78"
          rx="55"
          ry="20"
          fill={GOLD}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {/* Base */}
      <rect x="30" y="76" width="140" height="72" rx="12" fill="#A5673F" />
      <rect x="30" y="136" width="140" height="12" rx="6" fill="#7C4D2E" />
      <rect x="52" y="76" width="14" height="72" fill={GOLD} />
      <rect x="134" y="76" width="14" height="72" fill={GOLD} />
      <rect x="52" y="76" width="14" height="72" fill="#000" opacity="0.12" />
      <rect x="134" y="76" width="14" height="72" fill="#000" opacity="0.12" />
      {/* Dark opening */}
      <rect x="34" y="76" width="132" height="8" fill="#4A2E17" />

      {/* Lid (swings back around its rear hinge) */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        animate={open ? { rotateX: 0, rotate: -14, y: -46, x: -8 } : { rotate: 0, y: 0, x: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
      >
        <path d="M30 76 a70 40 0 0 1 140 0 z" fill="#C17E4A" />
        <path d="M30 76 a70 40 0 0 1 140 0 z" fill="#000" opacity="0.06" />
        <path d="M52 40 v36 h14 v-42 a70 40 0 0 0 -14 6 z" fill={GOLD} />
        <path d="M134 34 v42 h14 v-36 a70 40 0 0 0 -14 -6 z" fill={GOLD} />
        {/* Lock plate on the lid front */}
        <rect x="88" y="62" width="24" height="22" rx="6" fill={GOLD} />
        <rect x="88" y="62" width="24" height="22" rx="6" fill="#000" opacity="0.08" />
        <circle cx="100" cy="70" r="4" fill="#7C4D2E" />
        <rect x="98" y="70" width="4" height="8" rx="2" fill="#7C4D2E" />
      </motion.g>
    </svg>
  </motion.div>
);

const ItemArt = ({ item, color }: { item: ChestItem; color: string }) => {
  if (item.type === "badge" && item.css_class) {
    return <BadgeArt badge={item.css_class} className="w-14 h-14" />;
  }
  const Icon = item.type === "frame" ? Frame : item.type === "theme" ? Palette : Award;
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}22` }}>
      <Icon className="w-8 h-8" style={{ color }} strokeWidth={2.5} />
    </div>
  );
};

export const ChestCeremony = ({
  isOpen,
  title,
  kicker,
  reward,
  onOpen,
  introSound,
  onClose,
}: ChestCeremonyProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [phase, setPhase] = useState<"chest" | "opening" | "reward">("chest");
  /** Both must be true to reveal: the shake has played, and `onOpen` settled. */
  const [shakeDone, setShakeDone] = useState(false);
  const [openSettled, setOpenSettled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Cancelled on unmount/close so the reveal never fires into a dead tree. */
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Set synchronously on the first tap. `phase` only changes on the next
   * render, so a fast double tap passed the phase check twice and called
   * `onOpen` twice — for the badge chest, two server calls and two boxes gone.
   */
  const tapped = useRef(false);

  const playSound = (url: string) => {
    try {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {});
    } catch {
      /* ignore audio errors */
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    haptic("medium");
    if (introSound) playSound(introSound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      audioRef.current?.pause();
    },
    [],
  );

  // Reveal once the shake has played and the reward is in hand.
  useEffect(() => {
    if (phase !== "opening" || !shakeDone || !openSettled || !reward) return;
    setPhase("reward");
    haptic("heavy");

    const rarity = reward.item?.rarity ?? (reward.item ? "epic" : undefined);
    playSound(
      rarity === "legendary" ? SOUNDS.legendary : reward.item ? SOUNDS.epic : SOUNDS.reveal,
    );
    // Confetti is decorative — a failure here must never break the reveal.
    // Counts kept modest: more was a visible frame-rate hit on mid-range Android.
    try {
      confetti({
        particleCount: rarity === "legendary" ? 100 : reward.item ? 80 : 50,
        spread: 90,
        origin: { y: 0.55 },
        colors:
          rarity === "legendary"
            ? ["#FFC800", "#FFD84D", "#FF9600"]
            : rarity === "epic"
              ? ["#CE82FF", "#A560D9", "#FFC800"]
              : ["#FFC800", "#FFD84D", "#1CB0F6", "#58CC02"],
        disableForReducedMotion: true,
      });
    } catch (err) {
      console.warn("Confetti failed:", err);
    }
  }, [phase, shakeDone, openSettled, reward]);

  const handleOpenChest = async () => {
    if (phase !== "chest" || tapped.current) return;
    tapped.current = true;
    setPhase("opening");
    setShakeDone(false);
    setOpenSettled(false);
    playSound(SOUNDS.boxShake);
    haptic("light");
    shakeTimer.current = setTimeout(() => setShakeDone(true), SHAKE_MS);

    try {
      await onOpen?.();
      setOpenSettled(true);
    } catch {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      audioRef.current?.pause();
      tapped.current = false;
      setPhase("chest");
    }
  };

  const handleClose = () => {
    if (shakeTimer.current) {
      clearTimeout(shakeTimer.current);
      shakeTimer.current = null;
    }
    audioRef.current?.pause();
    tapped.current = false;
    setPhase("chest");
    setShakeDone(false);
    setOpenSettled(false);
    onClose();
  };

  if (!isOpen) return null;

  const item = reward?.item ?? null;
  const rarityColor = item?.rarity ? RARITY_BORDERS[item.rarity] : GOLD;
  const hasCurrency = !!reward && ((reward.coins ?? 0) > 0 || (reward.xp ?? 0) > 0);

  // Portalled to <body>: a transformed ancestor would trap `fixed`, and the
  // badge chest opens over a modal dialog that sets `pointer-events: none` on
  // everything outside it — hence the explicit `pointerEvents: auto`.
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="duo-page fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(6,6,10,0.94)", pointerEvents: "auto" }}
        dir={bi("rtl", "ltr")}
      >
        {phase !== "chest" && (
          <motion.div
            className="absolute w-[min(150vmax,900px)] h-[min(150vmax,900px)] rounded-full pointer-events-none"
            style={{ background: RAYS, willChange: "transform" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            transition={{ opacity: { duration: 0.5 }, rotate: { duration: 24, repeat: Infinity, ease: "linear" } }}
          />
        )}

        <div className="relative flex flex-col items-center px-6 max-w-sm w-full">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-6"
          >
            {kicker && (
              <p className="text-sm font-extrabold tracking-widest" style={{ color: GOLD }}>
                {kicker}
              </p>
            )}
            <p className="text-3xl font-extrabold text-white">{title}</p>
          </motion.div>

          {phase !== "reward" ? (
            <>
              <motion.button
                initial={{ scale: 0, y: 60 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                onClick={handleOpenChest}
                className="relative outline-none"
                aria-label={bi("افتح الصندوق", "Open the chest")}
              >
                <motion.div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: GOLD, willChange: "opacity" }}
                  animate={{ opacity: [0.15, 0.35, 0.15] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <Chest open={false} shaking={phase === "opening"} />
              </motion.button>

              <motion.p
                animate={{ opacity: phase === "chest" ? [0.5, 1, 0.5] : 0 }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mt-6 text-base font-extrabold text-white/90"
              >
                {phase === "chest" ? bi("اضغط على الصندوق لفتحه", "TAP THE CHEST TO OPEN") : ""}
              </motion.p>
            </>
          ) : (
            <>
              <motion.div initial={{ scale: 1 }} animate={{ scale: 0.72, y: 24 }} className="-mb-6">
                <Chest open shaking={false} />
              </motion.div>

              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="w-full rounded-3xl p-5 text-center"
                style={{
                  background: "hsl(var(--duo-surface))",
                  border: `3px solid ${rarityColor}`,
                  boxShadow: `0 5px 0 ${rarityColor}66`,
                }}
              >
                {/* Points */}
                {(reward?.coins ?? 0) > 0 && (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <DuoGem className="w-9 h-9" />
                      <span className="text-4xl font-extrabold" style={{ color: "#1CB0F6" }}>
                        +{reward!.coins}
                      </span>
                    </div>
                    <p className="text-sm font-bold mt-1" style={{ color: "hsl(var(--duo-muted))" }}>
                      {bi("نقطة", "points")}
                    </p>
                  </>
                )}

                {/* XP */}
                {(reward?.xp ?? 0) > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <Star className="w-5 h-5" style={{ color: GOLD }} fill={GOLD} strokeWidth={2.5} />
                    <span className="font-extrabold" style={{ color: GOLD }}>
                      +{reward!.xp} XP
                    </span>
                  </div>
                )}

                {/* Cosmetic: a bonus under the currency, or the reward itself */}
                {item && (
                  <div
                    className={hasCurrency ? "mt-4 pt-4" : ""}
                    style={hasCurrency ? { borderTop: "2px solid hsl(var(--duo-border))" } : undefined}
                  >
                    {hasCurrency && (
                      <p className="text-xs font-extrabold tracking-widest mb-2" style={{ color: GOLD }}>
                        {bi("جائزة إضافية!", "BONUS DROP!")}
                      </p>
                    )}
                    <div className="flex items-center justify-center mb-2">
                      <ItemArt item={item} color={rarityColor} />
                    </div>
                    <h3 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                      {isArabic ? item.name_ar : item.name}
                    </h3>
                    {item.rarity && (
                      <p className={`text-sm font-extrabold ${RARITY_TEXT_COLORS[item.rarity]}`}>
                        {isArabic ? RARITY_LABELS[item.rarity].ar : RARITY_LABELS[item.rarity].en}
                      </p>
                    )}
                    <p className="text-xs font-semibold mt-1" style={{ color: "hsl(var(--duo-muted))" }}>
                      {item.type === "frame" && bi("إطار للصورة الشخصية", "Profile Frame")}
                      {item.type === "badge" && bi("شارة بجانب الاسم", "Name Badge")}
                      {item.type === "theme" && bi("لون التطبيق", "App Theme")}
                    </p>
                  </div>
                )}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={handleClose}
                className="duo-press mt-5 w-full py-3.5 rounded-2xl font-extrabold text-white tracking-wide"
                style={{ background: "#58CC02", boxShadow: "0 4px 0 #45A302" }}
              >
                {bi("استمرار", "CONTINUE")}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};
