import { useState, useEffect, useRef } from "react";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeArt } from "./BadgeArt";
import { Frame, Palette } from "lucide-react";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { CosmeticItem, RARITY_TEXT_COLORS, RARITY_LABELS } from "./types";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import confetti from "canvas-confetti";

interface LevelUpRewardAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  reward: CosmeticItem | null;
  bonusPoints: number;
  level: number;
}

const SOUNDS = {
  levelUp: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  boxShake: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  reveal: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  legendary: "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3",
  epic: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3",
};

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

export const LevelUpRewardAnimation = ({
  isOpen,
  onClose,
  reward,
  bonusPoints,
  level,
}: LevelUpRewardAnimationProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [phase, setPhase] = useState<"chest" | "opening" | "reward">("chest");
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    if (isOpen && phase === "chest") {
      playSound(SOUNDS.levelUp);
      haptic("medium");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleOpenChest = () => {
    if (phase !== "chest") return;
    setPhase("opening");
    playSound(SOUNDS.boxShake);
    haptic("light");

    setTimeout(() => {
      setPhase("reward");
      haptic("heavy");

      if (reward?.rarity === "legendary") {
        playSound(SOUNDS.legendary);
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.55 }, colors: ["#FFC800", "#FFD84D", "#FF9600"] });
      } else if (reward?.rarity === "epic") {
        playSound(SOUNDS.epic);
        confetti({ particleCount: 110, spread: 85, origin: { y: 0.55 }, colors: ["#CE82FF", "#A560D9", "#FFC800"] });
      } else {
        playSound(SOUNDS.reveal);
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.55 }, colors: ["#FFC800", "#58CC02", "#1CB0F6"] });
      }
    }, 1400);
  };

  const handleClose = () => {
    if (audioRef.current) audioRef.current.pause();
    setPhase("chest");
    onClose();
  };

  if (!isOpen) return null;

  const rarityColor = reward ? RARITY_BORDERS[reward.rarity] || GOLD : GOLD;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="duo-page fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(6,6,10,0.94)" }}
        dir={bi("rtl", "ltr")}
      >
        {/* Rotating golden rays behind everything (visible once opening starts) */}
        {phase !== "chest" && (
          <motion.div
            className="absolute w-[150vmax] h-[150vmax] rounded-full pointer-events-none"
            style={{ background: RAYS }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            transition={{ opacity: { duration: 0.5 }, rotate: { duration: 24, repeat: Infinity, ease: "linear" } }}
          />
        )}

        <div className="relative flex flex-col items-center px-6 max-w-sm w-full">
          {/* Level banner */}
          <motion.div
            initial={{ y: -30, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-center mb-6"
          >
            <p className="text-sm font-extrabold tracking-widest" style={{ color: GOLD }}>
              {bi("مستوى جديد", "LEVEL UP")}
            </p>
            <p className="text-6xl font-extrabold text-white leading-tight">
              {isArabic ? `المستوى ${level}` : `Level ${level}`}
            </p>
          </motion.div>

          {phase !== "reward" ? (
            <>
              {/* Tappable chest */}
              <motion.button
                initial={{ scale: 0, y: 60 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.2 }}
                onClick={handleOpenChest}
                className="relative outline-none"
              >
                {/* Pulsing glow under the chest */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: GOLD }}
                  animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.05, 0.9] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <Chest open={false} shaking={phase === "opening"} />
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "chest" ? [0.5, 1, 0.5] : 0 }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mt-6 text-base font-extrabold text-white/90"
              >
                {phase === "chest"
                  ? (bi("اضغط على الصندوق لفتحه", "TAP THE CHEST TO OPEN"))
                  : ""}
              </motion.p>
            </>
          ) : (
            <>
              {/* Opened chest + reward card */}
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
                {reward && (
                  <>
                    <div className="flex items-center justify-center mb-2">
                      {reward.type === "badge" ? (
                        <BadgeArt badge={reward.css_class} className="w-16 h-16" />
                      ) : reward.type === "frame" ? (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${rarityColor}22` }}>
                          <Frame className="w-9 h-9" style={{ color: rarityColor }} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${rarityColor}22` }}>
                          <Palette className="w-9 h-9" style={{ color: rarityColor }} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                      {isArabic ? reward.name_ar : reward.name}
                    </h3>
                    <p className={`text-sm font-extrabold mt-0.5 ${RARITY_TEXT_COLORS[reward.rarity]}`}>
                      {isArabic ? RARITY_LABELS[reward.rarity].ar : RARITY_LABELS[reward.rarity].en}
                    </p>
                    <p className="text-xs font-semibold mt-1" style={{ color: "hsl(var(--duo-muted))" }}>
                      {reward.type === "frame" && (bi("إطار للصورة الشخصية", "Profile Frame"))}
                      {reward.type === "badge" && (bi("شارة بجانب الاسم", "Name Badge"))}
                      {reward.type === "theme" && (bi("لون التطبيق", "App Theme"))}
                    </p>
                  </>
                )}

                {bonusPoints > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <DuoGem className="w-5 h-5" />
                    <span className="font-extrabold" style={{ color: "#1CB0F6" }}>
                      +{bonusPoints} {bi("نقطة", "points")}
                    </span>
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
    </AnimatePresence>
  );
};
