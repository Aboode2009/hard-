import { useState, useEffect, useRef } from "react";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeArt } from "./BadgeArt";
import { Frame, Palette } from "lucide-react";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { Chest, RAYS } from "./LevelUpRewardAnimation";
import { CosmeticItem, RARITY_TEXT_COLORS, RARITY_LABELS } from "./types";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import confetti from "canvas-confetti";

export interface StoreChestReward {
  coins: number;
  item: CosmeticItem | null;
}

interface StoreChestAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  reward: StoreChestReward | null;
}

const SOUNDS = {
  boxShake: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  reveal: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  epic: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3",
};

const GOLD = "#FFC800";

const RARITY_BORDERS: Record<string, string> = {
  common: "#8FA3AD",
  rare: "#1CB0F6",
  epic: "#CE82FF",
  legendary: "#FFC800",
};

/** Store treasure chest ceremony: guaranteed coins + a possible bonus item. */
export const StoreChestAnimation = ({ isOpen, onClose, reward }: StoreChestAnimationProps) => {
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
    if (isOpen) haptic("medium");
  }, [isOpen]);

  const handleOpenChest = () => {
    if (phase !== "chest" || !reward) return;
    setPhase("opening");
    playSound(SOUNDS.boxShake);
    haptic("light");

    setTimeout(() => {
      setPhase("reward");
      haptic("heavy");
      playSound(reward.item ? SOUNDS.epic : SOUNDS.reveal);
      confetti({
        particleCount: reward.item ? 140 : 80,
        spread: 90,
        origin: { y: 0.55 },
        colors: ["#FFC800", "#FFD84D", "#1CB0F6", "#58CC02"],
      });
    }, 1400);
  };

  const handleClose = () => {
    if (audioRef.current) audioRef.current.pause();
    setPhase("chest");
    onClose();
  };

  if (!isOpen || !reward) return null;

  const rarityColor = reward.item ? RARITY_BORDERS[reward.item.rarity] || GOLD : GOLD;

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
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl font-extrabold text-white mb-6"
          >
            {bi("صندوق الكنز", "Treasure Chest")}
          </motion.p>

          {phase !== "reward" ? (
            <>
              <motion.button
                initial={{ scale: 0, y: 60 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                onClick={handleOpenChest}
                className="relative outline-none"
              >
                <motion.div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: GOLD }}
                  animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.05, 0.9] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <Chest open={false} shaking={phase === "opening"} />
              </motion.button>

              <motion.p
                animate={{ opacity: phase === "chest" ? [0.5, 1, 0.5] : 0 }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mt-6 text-base font-extrabold text-white/90"
              >
                {phase === "chest" ? (bi("اضغط على الصندوق لفتحه", "TAP THE CHEST TO OPEN")) : ""}
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
                {/* Guaranteed coins */}
                <div className="flex items-center justify-center gap-2">
                  <DuoGem className="w-9 h-9" />
                  <span className="text-4xl font-extrabold" style={{ color: "#1CB0F6" }}>
                    +{reward.coins}
                  </span>
                </div>
                <p className="text-sm font-bold mt-1" style={{ color: "hsl(var(--duo-muted))" }}>
                  {bi("عملة", "coins")}
                </p>

                {/* Bonus cosmetic item */}
                {reward.item && (
                  <div className="mt-4 pt-4" style={{ borderTop: "2px solid hsl(var(--duo-border))" }}>
                    <p className="text-xs font-extrabold tracking-widest mb-2" style={{ color: GOLD }}>
                      {bi("جائزة إضافية!", "BONUS DROP!")}
                    </p>
                    <div className="flex items-center justify-center mb-2">
                      {reward.item.type === "badge" ? (
                        <BadgeArt badge={reward.item.css_class} className="w-14 h-14" />
                      ) : reward.item.type === "frame" ? (
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${rarityColor}22` }}>
                          <Frame className="w-8 h-8" style={{ color: rarityColor }} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${rarityColor}22` }}>
                          <Palette className="w-8 h-8" style={{ color: rarityColor }} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                      {isArabic ? reward.item.name_ar : reward.item.name}
                    </h3>
                    <p className={`text-sm font-extrabold ${RARITY_TEXT_COLORS[reward.item.rarity]}`}>
                      {isArabic ? RARITY_LABELS[reward.item.rarity].ar : RARITY_LABELS[reward.item.rarity].en}
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
    </AnimatePresence>
  );
};
