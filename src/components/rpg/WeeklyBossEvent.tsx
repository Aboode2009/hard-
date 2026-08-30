import { useState, useEffect, useRef, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skull, Clock, Swords, Crown, Gift, Sparkles, Volume2, VolumeX, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface WeeklyBossEventProps {
  event: {
    boss_name: string;
    boss_name_ar: string;
    boss_emoji: string;
    quest: {
      title: string;
      title_ar: string;
      description: string;
      description_ar: string;
      icon: string;
    };
    ends_at: string;
  };
  questCompleted: boolean;
  showChest: boolean;
  chestOpened: boolean;
  rewards: {
    lemons: number;
    xp: number;
    cosmetic: { name: string; name_ar: string; type: string } | null;
  } | null;
  getTimeRemaining: () => { hours: number; minutes: number; seconds: number; total: number };
  onCompleteQuest: () => void;
  onOpenChest: () => void;
  onClaimRewards: () => void;
  isArabic?: boolean;
  className?: string;
}

export const WeeklyBossEvent = ({
  event,
  questCompleted,
  showChest,
  chestOpened,
  rewards,
  getTimeRemaining,
  onCompleteQuest,
  onOpenChest,
  onClaimRewards,
  isArabic = false,
  className,
}: WeeklyBossEventProps) => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chestShakes, setChestShakes] = useState(0);
  const [showLootReveal, setShowLootReveal] = useState(false);
  const [currentLootIndex, setCurrentLootIndex] = useState(0);
  const [flyingLemons, setFlyingLemons] = useState(false);

  // Audio refs for sound effects
  const clankSound = useRef<HTMLAudioElement | null>(null);
  const shatterSound = useRef<HTMLAudioElement | null>(null);
  const chestOpenSound = useRef<HTMLAudioElement | null>(null);
  const coinSound = useRef<HTMLAudioElement | null>(null);
  const whooshSound = useRef<HTMLAudioElement | null>(null);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [getTimeRemaining]);

  // Play sound effect
  const playSound = useCallback((sound: HTMLAudioElement | null) => {
    if (soundEnabled && sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Handle chest tap
  const handleChestTap = () => {
    if (chestOpened) return;
    
    playSound(clankSound.current);
    setChestShakes(prev => prev + 1);

    if (chestShakes >= 2) {
      // Open the chest after 3 taps
      playSound(chestOpenSound.current);
      onOpenChest();
      
      // Trigger confetti
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#FFD700", "#FFA500", "#FF6B6B", "#4CAF50", "#00BCD4"],
        });
      }, 300);

      // Start loot reveal sequence
      setTimeout(() => {
        setShowLootReveal(true);
        playSound(whooshSound.current);
      }, 800);
    }
  };

  // Loot reveal animation sequence
  useEffect(() => {
    if (showLootReveal && rewards) {
      const totalItems = rewards.cosmetic ? 3 : 2;
      
      if (currentLootIndex < totalItems) {
        const timer = setTimeout(() => {
          playSound(coinSound.current);
          setCurrentLootIndex(prev => prev + 1);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [showLootReveal, currentLootIndex, rewards, playSound]);

  // Format time for display
  const formatTime = (value: number) => value.toString().padStart(2, '0');

  // Fire particle effect component
  const FireParticle = ({ delay }: { delay: number }) => (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent"
      initial={{ y: 0, opacity: 0, scale: 0 }}
      animate={{
        y: [-10, -60],
        opacity: [0, 1, 0],
        scale: [0.5, 1, 0.3],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        delay,
        ease: "easeOut",
      }}
    />
  );

  if (!event) return null;

  return (
    <>
      {/* Hidden audio elements for sound effects */}
      <audio ref={clankSound} src="https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" preload="auto" />
      <audio ref={shatterSound} src="https://assets.mixkit.co/active_storage/sfx/2970/2970-preview.mp3" preload="auto" />
      <audio ref={chestOpenSound} src="https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3" preload="auto" />
      <audio ref={coinSound} src="https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3" preload="auto" />
      <audio ref={whooshSound} src="https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3" preload="auto" />

      {/* Main Event Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-destructive/50",
          "bg-gradient-to-br from-destructive/20 via-background to-destructive/10",
          className
        )}
      >
        {/* Tattered banner effect - top decorations */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-destructive via-destructive/80 to-destructive" />
        <div className="absolute top-2 left-4 w-3 h-8 bg-destructive/60 clip-triangle-down" />
        <div className="absolute top-2 left-12 w-3 h-6 bg-destructive/40 clip-triangle-down" />
        <div className="absolute top-2 right-4 w-3 h-8 bg-destructive/60 clip-triangle-down" />
        <div className="absolute top-2 right-12 w-3 h-6 bg-destructive/40 clip-triangle-down" />

        {/* Background fire effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0"
              style={{ left: `${5 + i * 8}%` }}
            >
              <FireParticle delay={i * 0.15} />
            </div>
          ))}
          {/* Ambient glow */}
          <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-red-500/20 rounded-full blur-2xl" />
        </div>

        <div className="relative p-4 pt-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Skull className="w-5 h-5 text-destructive" />
              </motion.div>
              <span className="text-sm font-black text-destructive uppercase tracking-widest">
                {bi("حدث خاص: غزو الزعيم", "SPECIAL EVENT: BOSS INVASION")}
              </span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Monster Display */}
          <div className="flex flex-col items-center gap-3">
            {/* Monster with breathing animation */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, -2, 2, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="text-8xl filter drop-shadow-2xl">
                {event.boss_emoji}
              </div>
              {/* Glow effect behind monster */}
              <div className="absolute inset-0 -z-10 bg-destructive/30 blur-2xl rounded-full scale-150" />
            </motion.div>

            {/* Boss Name */}
            <h2 className="text-xl font-black text-foreground text-center">
              {isArabic ? event.boss_name_ar : event.boss_name}
            </h2>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center justify-center gap-2 bg-destructive/20 rounded-xl py-3 px-4 border border-destructive/30">
            <Clock className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-muted-foreground">
              {bi("الوقت المتبقي:", "Time Left:")}
            </span>
            <span className="font-mono text-2xl font-bold text-destructive">
              {formatTime(timeRemaining.hours)}:{formatTime(timeRemaining.minutes)}:{formatTime(timeRemaining.seconds)}
            </span>
          </div>

          {/* Quest Card */}
          <div className={cn(
            "relative p-4 rounded-xl border-2",
            questCompleted
              ? "bg-primary/10 border-primary/50"
              : "bg-card border-destructive/30"
          )}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{event.quest.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Swords className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-bold text-destructive uppercase tracking-wider">
                    {bi("المهمة", "QUEST")}
                  </span>
                </div>
                <h3 className="font-bold text-lg">
                  {isArabic ? event.quest.title_ar : event.quest.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isArabic ? event.quest.description_ar : event.quest.description}
                </p>
              </div>
              {questCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-primary rounded-full p-2"
                >
                  <Check className="w-5 h-5 text-primary-foreground" />
                </motion.div>
              )}
            </div>

            {/* Complete Quest Button */}
            {!questCompleted && (
              <Button
                onClick={() => {
                  playSound(shatterSound.current);
                  onCompleteQuest();
                }}
                className="w-full mt-4 bg-gradient-to-r from-primary to-primary-light hover:opacity-90"
              >
                <Check className="w-4 h-4 mr-2" />
                {bi("أكملت المهمة!", "I Completed the Quest!")}
              </Button>
            )}
          </div>

          {/* Warning Footer */}
          <div className="text-center text-xs text-destructive/80 bg-destructive/10 rounded-lg p-2 border border-destructive/20">
            <span className="font-bold">⚠️ {bi("تحذير:", "WARNING:")}</span>{" "}
            {bi("إذا انتهى الوقت بدون إكمال المهمة، ستخسر 50% من ليموناتك!", "If time runs out without completing the quest, you'll lose 50% of your lemons!")}
          </div>
        </div>
      </motion.div>

      {/* Chest Opening Modal */}
      <AnimatePresence>
        {showChest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 100 }}
              className="relative max-w-md w-full text-center space-y-6"
            >
              {!showLootReveal ? (
                <>
                  {/* Chest before opening */}
                  <div className="space-y-4">
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="text-2xl font-black text-primary"
                    >
                      {bi("اضغط لفتح الصندوق!", "TAP TO OPEN!")}
                    </motion.div>

                    <motion.button
                      onClick={handleChestTap}
                      whileTap={{ scale: 0.95 }}
                      animate={chestShakes > 0 ? {
                        x: [0, -10, 10, -10, 10, 0],
                        rotate: [0, -5, 5, -5, 5, 0],
                      } : {}}
                      transition={{ duration: 0.4 }}
                      className="relative mx-auto block"
                    >
                      <div className="text-[120px] filter drop-shadow-2xl">
                        🎁
                      </div>
                      {/* Legendary glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/50 via-orange-500/30 to-transparent blur-2xl -z-10" />
                    </motion.button>

                    <div className="flex justify-center gap-2">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={cn(
                            "w-3 h-3 rounded-full transition-colors",
                            i < chestShakes ? "bg-primary" : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Loot Reveal */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-4xl font-black text-yellow-400 drop-shadow-lg">
                      {bi("🎉 مكافآتك! 🎉", "🎉 YOUR LOOT! 🎉")}
                    </div>

                    {/* Opened chest */}
                    <div className="text-8xl">📦</div>

                    {/* Rewards popping out */}
                    <div className="flex flex-col items-center gap-4">
                      {/* Lemons */}
                      <AnimatePresence>
                        {currentLootIndex >= 1 && rewards && (
                          <motion.div
                            initial={{ scale: 0, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-yellow-500/20 border-2 border-yellow-500/50 rounded-2xl p-4 flex items-center gap-4"
                          >
                            <div className="text-5xl">🍋</div>
                            <div className="text-left">
                              <div className="text-3xl font-black text-yellow-400">
                                +{rewards.lemons}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {bi("ليمون", "Lemons")}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* XP */}
                      <AnimatePresence>
                        {currentLootIndex >= 2 && rewards && (
                          <motion.div
                            initial={{ scale: 0, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-primary/20 border-2 border-primary/50 rounded-2xl p-4 flex items-center gap-4"
                          >
                            <div className="text-5xl">⭐</div>
                            <div className="text-left">
                              <div className="text-3xl font-black text-primary">
                                +{rewards.xp}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                XP
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Cosmetic */}
                      <AnimatePresence>
                        {currentLootIndex >= 3 && rewards?.cosmetic && (
                          <motion.div
                            initial={{ scale: 0, y: 50, rotate: -10 }}
                            animate={{ scale: 1, y: 0, rotate: 0 }}
                            className="bg-purple-500/20 border-2 border-purple-500/50 rounded-2xl p-4"
                          >
                            <div className="flex items-center gap-3">
                              <Crown className="w-10 h-10 text-purple-400" />
                              <div className="text-left">
                                <div className="text-xs text-purple-400 uppercase font-bold">
                                  {rewards.cosmetic.type === "frame" 
                                    ? (bi("إطار جديد", "NEW FRAME"))
                                    : (bi("شارة جديدة", "NEW BADGE"))}
                                </div>
                                <div className="text-xl font-bold text-foreground">
                                  {isArabic ? rewards.cosmetic.name_ar : rewards.cosmetic.name}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Claim button */}
                    {currentLootIndex >= (rewards?.cosmetic ? 3 : 2) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Button
                          onClick={onClaimRewards}
                          size="lg"
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-lg font-bold"
                        >
                          <Gift className="w-5 h-5 mr-2" />
                          {bi("استلم الكل!", "CLAIM ALL!")}
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Defeat Screen Component
export const DefeatScreen = ({
  isArabic,
  onClose,
}: {
  isArabic: boolean;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.5 }}
      animate={{ scale: 1 }}
      className="text-center space-y-6 max-w-sm"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-8xl"
      >
        😢
      </motion.div>
      <h2 className="text-4xl font-black text-destructive">
        {bi("هزيمة...", "DEFEAT...")}
      </h2>
      <p className="text-lg text-muted-foreground">
        {bi("الشيطان هرب... خسرت 50% من ليموناتك", "The Demon Escaped... You lost 50% of your lemons")}
      </p>
      <Button onClick={onClose} variant="outline" className="mt-4">
        {bi("حسناً", "OK")}
      </Button>
    </motion.div>
  </motion.div>
);
