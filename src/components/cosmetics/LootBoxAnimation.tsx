import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Star, Frame, Palette } from "lucide-react";
import { BadgeArt } from "./BadgeArt";
import { Button } from "@/components/ui/button";
import { CosmeticItem, RARITY_COLORS, RARITY_TEXT_COLORS, RARITY_LABELS } from "./types";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";

interface LootBoxAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  reward: CosmeticItem | null;
  onOpenBox: () => void;
  isOpening: boolean;
}

export const LootBoxAnimation = ({
  isOpen,
  onClose,
  reward,
  onOpenBox,
  isOpening,
}: LootBoxAnimationProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [showReward, setShowReward] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0);

  useEffect(() => {
    if (isOpening) {
      // Gradually increase shake intensity
      const interval = setInterval(() => {
        setShakeIntensity(prev => Math.min(prev + 1, 10));
      }, 200);

      // After 2 seconds, show the reward
      const timer = setTimeout(() => {
        setShowReward(true);
        clearInterval(interval);
        
        // Fire confetti for legendary/epic items
        if (reward?.rarity === 'legendary' || reward?.rarity === 'epic') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: reward.rarity === 'legendary' 
              ? ['#f59e0b', '#fbbf24', '#fcd34d'] 
              : ['#a855f7', '#c084fc', '#d8b4fe'],
          });
        }
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else {
      setShakeIntensity(0);
      setShowReward(false);
    }
  }, [isOpening, reward]);

  const handleClose = () => {
    setShowReward(false);
    setShakeIntensity(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-sm w-full mx-4"
        >
          {!showReward ? (
            // Loot Box
            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={{
                  rotate: isOpening ? [0, -shakeIntensity, shakeIntensity, -shakeIntensity, shakeIntensity, 0] : 0,
                  scale: isOpening ? [1, 1.05, 1, 1.05, 1] : 1,
                }}
                transition={{
                  duration: 0.2,
                  repeat: isOpening ? Infinity : 0,
                }}
                className="relative"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/50 to-orange-600/50 rounded-3xl blur-xl scale-110" />
                
                {/* Box */}
                <div className="relative w-40 h-40 bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-amber-400">
                  <Gift className="w-20 h-20 text-amber-200" />
                  
                  {/* Sparkles */}
                  <Sparkles className="absolute top-2 right-2 w-6 h-6 text-amber-200 animate-pulse" />
                  <Sparkles className="absolute bottom-2 left-2 w-5 h-5 text-amber-300 animate-pulse delay-150" />
                  <Star className="absolute top-4 left-4 w-4 h-4 text-amber-100 animate-ping" />
                </div>
              </motion.div>

              <Button
                onClick={onOpenBox}
                disabled={isOpening}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
              >
                {isOpening 
                  ? (bi("جاري الفتح...", "Opening...")) 
                  : (bi("افتح الصندوق!", "Open Box!"))}
              </Button>
            </div>
          ) : (
            // Reward reveal
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="flex flex-col items-center gap-6"
            >
              <div className={`relative p-8 rounded-3xl border-4 ${reward ? RARITY_COLORS[reward.rarity] : ''} bg-card shadow-2xl`}>
                {/* Rarity glow */}
                {reward?.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-orange-600/30 rounded-3xl animate-pulse" />
                )}
                {reward?.rarity === 'epic' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-violet-600/30 rounded-3xl animate-pulse" />
                )}

                <div className="relative text-center">
                  {/* Item display */}
                  <div className="mb-4 flex items-center justify-center">
                    {reward?.type === 'badge' && <BadgeArt badge={reward.css_class} className="w-16 h-16" />}
                    {reward?.type === 'frame' && <Frame className="w-14 h-14 text-primary" strokeWidth={2} />}
                    {reward?.type === 'theme' && <Palette className="w-14 h-14 text-primary" strokeWidth={2} />}
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {isArabic ? reward?.name_ar : reward?.name}
                  </h3>

                  <p className={`text-sm font-semibold ${reward ? RARITY_TEXT_COLORS[reward.rarity] : ''}`}>
                    {reward && (isArabic ? RARITY_LABELS[reward.rarity].ar : RARITY_LABELS[reward.rarity].en)}
                  </p>

                  <p className="text-xs text-muted-foreground mt-2">
                    {reward?.type === 'frame' && (bi("إطار للصورة الشخصية", "Profile Frame"))}
                    {reward?.type === 'badge' && (bi("شارة بجانب الاسم", "Name Badge"))}
                    {reward?.type === 'theme' && (bi("لون التطبيق", "App Theme"))}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleClose}
                variant="outline"
                className="font-semibold"
              >
                {bi("رائع!", "Awesome!")}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
