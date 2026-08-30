import { useState, useRef, useEffect, type ReactNode } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sun, Moon, Hand, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import welcomeBoard from "@/assets/welcome-board.png";
import thinkingBoy from "@/assets/thinking-boy.png";
import openArmsBoy from "@/assets/open-arms-boy.png";

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

// Decorative vine component for visual appeal
const DecorativeVines = ({ position }: { position: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) => {
  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-0 left-0 -translate-x-1/4 -translate-y-1/4";
      case "top-right":
        return "top-0 right-0 translate-x-1/4 -translate-y-1/4 scale-x-[-1]";
      case "bottom-left":
        return "bottom-20 left-0 -translate-x-1/4 translate-y-1/4 rotate-180 scale-x-[-1]";
      case "bottom-right":
        return "bottom-20 right-0 translate-x-1/4 translate-y-1/4 rotate-180";
    }
  };

  return (
    <div className={`absolute ${getPositionClasses()} pointer-events-none z-0`}>
      <svg width="200" height="200" viewBox="0 0 200 200" className="opacity-80">
        <defs>
          <linearGradient id="vineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        {/* Vine branches */}
        <path 
          d="M20 180 Q60 140 80 100 Q100 60 140 40 Q160 30 180 20" 
          stroke="url(#vineGradient)" 
          strokeWidth="3" 
          fill="none"
          className="animate-[drawPath_2s_ease-out]"
        />
        <path 
          d="M40 160 Q70 130 90 100 Q110 70 130 60" 
          stroke="url(#vineGradient)" 
          strokeWidth="2" 
          fill="none"
        />
        {/* Leaves */}
        <ellipse cx="140" cy="40" rx="20" ry="12" fill="url(#leafGradient)" transform="rotate(-30 140 40)" />
        <ellipse cx="100" cy="70" rx="16" ry="10" fill="url(#leafGradient)" transform="rotate(-45 100 70)" />
        <ellipse cx="70" cy="110" rx="18" ry="11" fill="url(#leafGradient)" transform="rotate(-20 70 110)" />
        <ellipse cx="50" cy="140" rx="15" ry="9" fill="url(#leafGradient)" transform="rotate(-60 50 140)" />
        <ellipse cx="160" cy="50" rx="14" ry="8" fill="url(#leafGradient)" transform="rotate(10 160 50)" />
        <ellipse cx="120" cy="55" rx="12" ry="7" fill="url(#leafGradient)" transform="rotate(-35 120 55)" />
        <ellipse cx="85" cy="90" rx="13" ry="8" fill="url(#leafGradient)" transform="rotate(-50 85 90)" />
      </svg>
    </div>
  );
};

/* Drawn avatars for the gender cards — same art direction as the mascot
   (black spiky hair, black hoodie with orange accents). */
const MaleAvatar = () => (
  <svg viewBox="0 0 100 100" className="h-14 w-14">
    {/* hoodie */}
    <path d="M18 98 Q20 68 50 66 Q80 68 82 98 Z" fill="#1c1c1e" />
    <path d="M34 74 Q50 62 66 74 L62 80 Q50 70 38 80 Z" fill="#F0532D" />
    {/* face */}
    <circle cx="50" cy="40" r="21" fill="#F8C89B" />
    {/* spiky hair */}
    <path
      d="M28 38 Q26 20 38 16 Q42 8 52 10 Q60 6 66 14 Q74 16 72 28 Q76 32 71 38 Q70 26 62 24 Q54 20 46 24 Q34 24 33 34 Z"
      fill="#181818"
    />
    {/* eyes + smile */}
    <circle cx="42" cy="40" r="3" fill="#2b2b2b" />
    <circle cx="58" cy="40" r="3" fill="#2b2b2b" />
    <path d="M42 49 Q50 56 58 49" stroke="#2b2b2b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

const FemaleAvatar = () => (
  <svg viewBox="0 0 100 100" className="h-14 w-14">
    {/* long hair behind (two side locks) */}
    <path d="M28 92 Q22 46 34 28 Q42 14 50 14 Q58 14 66 28 Q78 46 72 92 L60 92 Q64 60 60 44 L40 44 Q36 60 40 92 Z" fill="#181818" />
    {/* top */}
    <path d="M22 98 Q24 72 50 70 Q76 72 78 98 Z" fill="#EC5B84" />
    {/* face */}
    <circle cx="50" cy="42" r="19" fill="#F8C89B" />
    {/* soft rounded bangs */}
    <path d="M31 38 Q31 20 50 19 Q69 20 69 38 Q62 27 50 27 Q38 27 31 38 Z" fill="#181818" />
    {/* eyes + smile + blush */}
    <circle cx="43" cy="42" r="3" fill="#2b2b2b" />
    <circle cx="57" cy="42" r="3" fill="#2b2b2b" />
    <path d="M44 50 Q50 55 56 50" stroke="#2b2b2b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="37" cy="48" r="3" fill="#F5A9A9" opacity="0.7" />
    <circle cx="63" cy="48" r="3" fill="#F5A9A9" opacity="0.7" />
  </svg>
);

/**
 * Open-arms boy for the gender slide: an illustrated pick CARD floats over
 * each hand. Same physics as the other mascots — springy entrance, endless
 * float/sway; the cards bob on their own on top of the boy's motion.
 */
const GenderPickBoy = ({
  value,
  onPick,
  maleLabel,
  femaleLabel,
}: {
  value: "male" | "female" | null;
  onPick: (g: "male" | "female") => void;
  maleLabel: string;
  femaleLabel: string;
}) => {
  const card = (
    gender: "male" | "female",
    label: string,
    avatar: ReactNode,
    pos: { left: string; top: string },
    delay: number,
  ) => (
    // outer div owns the centering transform — framer-motion overwrites
    // `transform` on the element it animates, so they must be separate
    <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={pos}>
      <motion.button
        type="button"
        onClick={() => onPick(gender)}
        className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3.5 py-2.5 shadow-xl transition-colors ${
          value === gender ? "border-primary bg-pink-50" : "border-gray-200 bg-white/95"
        }`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: value === gender ? 1.08 : 1, opacity: 1, y: [0, -5, 0] }}
        transition={{
          scale: { type: "spring", stiffness: 300, damping: 15, delay },
          opacity: { delay },
          y: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay },
        }}
        whileTap={{ scale: 0.88 }}
      >
        {avatar}
        <span
          className={`text-sm font-bold ${value === gender ? "text-primary" : "text-gray-700"}`}
        >
          {label}
        </span>
      </motion.button>
    </div>
  );

  return (
    <div className="relative flex justify-center">
      {/* ground shadow that reacts to the float */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-1/2 h-4 w-40 -translate-x-1/2 rounded-full bg-black/20 blur-md"
        animate={{ scale: [1, 0.82, 1], opacity: [0.3, 0.15, 0.3] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative"
        style={{ width: "min(78vw, 310px, calc(42dvh * 0.8))" }}
        initial={{ y: -60, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 130, damping: 12, mass: 0.9 }}
      >
        <motion.div
          className="relative"
          animate={{ y: [0, -8, 0], rotate: [-0.8, 0.8, -0.8] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "50% 95%" }}
        >
          <img src={openArmsBoy} alt="" draggable={false} className="w-full" />
          {card("male", maleLabel, <MaleAvatar />, { left: "13%", top: "16%" }, 0.25)}
          {card("female", femaleLabel, <FemaleAvatar />, { left: "87%", top: "16%" }, 0.4)}
        </motion.div>
      </motion.div>
    </div>
  );
};

/**
 * The mascot boy holding a whiteboard: springs in, then floats and sways
 * forever. The slide text is pinned INSIDE the whiteboard and moves with it.
 * Remounted per slide (key={current}) so the entrance replays on each slide.
 */
const BoardBoy = ({ text }: { text: string }) => (
  <div className="relative flex justify-center">
    {/* ground shadow that reacts to the float (squash & stretch) */}
    <motion.div
      className="pointer-events-none absolute bottom-1 h-4 w-36 rounded-full bg-black/20 blur-md"
      style={{ left: "16%" }}
      animate={{ scale: [1, 0.82, 1], opacity: [0.3, 0.15, 0.3] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* springy entrance */}
    <motion.div
      className="relative"
      style={{ width: "min(84vw, 360px, calc(46dvh * 0.8))" }}
      initial={{ y: -60, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 130, damping: 12, mass: 0.9 }}
    >
      {/* endless gentle float + sway, pivoting near the feet */}
      <motion.div
        className="relative"
        animate={{ y: [0, -8, 0], rotate: [-1, 1, -1] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50% 95%" }}
      >
        <img src={welcomeBoard} alt="" draggable={false} className="w-full" />
        {/* slide text pinned inside the whiteboard */}
        <div
          className="absolute flex items-center justify-center"
          style={{ left: "53.5%", top: "32%", width: "39.5%", height: "29%" }}
        >
          <p
            dir="auto"
            className={`px-1 text-center font-bold leading-snug text-gray-700 ${
              text.length > 100 ? "text-[10px]" : "text-[12px]"
            }`}
          >
            {text}
          </p>
        </div>
      </motion.div>
    </motion.div>
  </div>
);

/**
 * Thinking boy with a speech bubble above his head — whatever is passed as
 * children is pinned INSIDE the bubble (used for the name input). Same
 * physics as BoardBoy: springy entrance + endless gentle float and sway.
 */
const ThinkingBoy = ({ children }: { children: ReactNode }) => (
  <div className="relative flex justify-center">
    {/* Springy entrance only — NO continuous float/sway here: the speech
        bubble holds a text input, and a moving/rotating target is impossible
        to tap and type into on a phone. Only the boy image floats. */}
    <motion.div
      className="relative"
      style={{ width: "min(88vw, 380px, calc(44dvh * 1.143))" }}
      initial={{ y: -60, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 130, damping: 12, mass: 0.9 }}
    >
      <img src={thinkingBoy} alt="" draggable={false} className="w-full" />
      {/* input pinned inside the speech bubble — static, so it's tappable */}
      <div
        className="absolute z-10 flex items-center justify-center"
        style={{ left: "12%", top: "8%", width: "76%", height: "16.5%" }}
      >
        {children}
      </div>
    </motion.div>
  </div>
);

export const WelcomeOnboarding = ({ onComplete }: WelcomeOnboardingProps) => {
  const [current, setCurrent] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [userGender, setUserGender] = useState<'male' | 'female' | null>(null);
  
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Define slide types
  type SlideType = 'content' | 'name' | 'age' | 'gender' | 'theme';

  interface Slide {
    title: string;
    subtitle?: string;
    content?: string;
    type: SlideType;
    hasThemeToggle?: boolean;
  }

  const slides: Slide[] = [
    {
      title: bi("مرحباً بك في Challenge 21", "Welcome to Challenge 21"),
      subtitle: bi("رحلتك تبدأ هنا", "Your Journey Starts Here"),
      content: bi("مرحباً بك في Challenge 21 - رفيقك الشخصي لبناء نسخة أفضل منك. يسعدنا انضمامك إلينا!", "Welcome to Challenge 21 - your personal companion for building a better you. We're excited to have you on board!"),
      type: 'content',
    },
    {
      title: bi("شنو تحب أناديك؟", "What should I call you?"),
      type: 'name',
    },
    {
      title: bi("كم عمرك؟", "What's your age?"),
      type: 'age',
    },
    {
      title: bi("اختر جنسك", "Choose your sex"),
      type: 'gender',
    },
    {
      title: t('onboarding.slide2.title'),
      subtitle: t('onboarding.slide2.subtitle'),
      content: t('onboarding.slide2.content'),
      type: 'content',
    },
    {
      title: t('onboarding.slide3.title'),
      subtitle: t('onboarding.slide3.subtitle'),
      content: t('onboarding.slide3.content'),
      type: 'content',
    },
    {
      title: t('onboarding.slide4.title'),
      subtitle: t('onboarding.slide4.subtitle'),
      content: t('onboarding.slide4.content'),
      type: 'content',
    },
    {
      title: t('onboarding.slide5.title'),
      subtitle: t('onboarding.slide5.subtitle'),
      content: t('onboarding.slide5.content'),
      type: 'theme',
      hasThemeToggle: true,
    },
  ];

  const slide = slides[current];

  // Hide hint after 3 seconds or first swipe
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleThemeChange = (dark: boolean) => {
    setIsDarkMode(dark);
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', dark);
  };

  const canProceed = () => {
    switch (slide.type) {
      case 'name':
        return userName.trim().length > 0;
      case 'age':
        return userAge.trim().length > 0 && !isNaN(Number(userAge)) && Number(userAge) > 0;
      case 'gender':
        return userGender !== null;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    
    setShowHint(false);
    if (current === slides.length - 1) {
      // Save user data to localStorage
      localStorage.setItem('userName', userName);
      localStorage.setItem('userAge', userAge);
      localStorage.setItem('userGender', userGender || '');
      onComplete();
    } else {
      setCurrent((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setShowHint(false);
    if (current > 0) {
      setCurrent((prev) => prev - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    // Reset the end position too: without this, a plain TAP (which fires no
    // touchmove) leaves a stale touchEndX from a previous gesture, so
    // handleTouchEnd sees a huge diff and treats the tap as a swipe —
    // navigating away instead of focusing the tapped input/button.
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (isArabic) {
        // RTL: swipe right = next, swipe left = prev
        if (diff < 0 && canProceed()) {
          handleNext();
        } else if (diff > 0) {
          handlePrev();
        }
      } else {
        // LTR: swipe left = next, swipe right = prev
        if (diff > 0 && canProceed()) {
          handleNext();
        } else if (diff < 0) {
          handlePrev();
        }
      }
    }
  };

  const handleDotClick = (index: number) => {
    // Only allow going back or staying on current
    if (index <= current) {
      setShowHint(false);
      setCurrent(index);
    }
  };

  const renderSlideContent = () => {
    switch (slide.type) {
      case 'name':
        return (
          <div className="animate-fade-in">
            <ThinkingBoy key={current}>
              <Input
                type="text"
                placeholder={bi("أحمد، محمد، فاطمة...", "Dennis, Frank, Mac...")}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="h-full w-full border-0 bg-transparent text-center text-lg font-bold text-gray-800 shadow-none placeholder:text-gray-400 focus-visible:ring-0"
              />
            </ThinkingBoy>
          </div>
        );
      case 'age':
        return (
          <div className="animate-fade-in">
            <ThinkingBoy key={current}>
              <Input
                type="number"
                placeholder={bi("العمر", "Age")}
                value={userAge}
                onChange={(e) => setUserAge(e.target.value)}
                min="1"
                max="120"
                className="h-full w-full border-0 bg-transparent text-center text-lg font-bold text-gray-800 shadow-none placeholder:text-gray-400 focus-visible:ring-0"
              />
            </ThinkingBoy>
          </div>
        );
      case 'gender':
        return (
          <div className="animate-fade-in">
            <GenderPickBoy
              key={current}
              value={userGender}
              onPick={setUserGender}
              maleLabel={bi("ذكر", "Male")}
              femaleLabel={bi("أنثى", "Female")}
            />
          </div>
        );
      case 'theme':
        return (
          <div className="space-y-4 animate-fade-in">
            <BoardBoy key={current} text={slide.content || ""} />
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  <Sun className="w-6 h-6 text-amber-500" />
                  <Label htmlFor="theme-toggle" className="cursor-pointer text-base text-gray-800">
                    {t('onboarding.lightMode')}
                  </Label>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={isDarkMode}
                  onCheckedChange={handleThemeChange}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-amber-500"
                />
                <div className="flex items-center gap-3">
                  <Label htmlFor="theme-toggle" className="cursor-pointer text-base text-gray-800">
                    {t('onboarding.darkMode')}
                  </Label>
                  <Moon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <BoardBoy key={current} text={slide.content || ""} />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center touch-pan-y overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FDE8E0 0%, #FECDD3 50%, #F9A8B5 100%)'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative Vines */}
      <DecorativeVines position="top-left" />
      <DecorativeVines position="top-right" />
      <DecorativeVines position="bottom-left" />

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 z-[70] px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
      >
        {t('onboarding.skip')}
      </button>

      {/* Swipe Hint Overlay */}
      {showHint && current === 0 && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-foreground/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-4 text-background">
            <div className="relative">
              <Hand className="w-16 h-16 animate-[swipe_1.5s_ease-in-out_infinite]" />
            </div>
            <p className="text-lg font-medium text-center px-4">
              {bi("مرر للانتقال للشريحة التالية", "Swipe to go to the next slide")}
            </p>
            <button 
              onClick={() => setShowHint(false)}
              className="mt-2 px-4 py-2 bg-background/20 rounded-full text-sm hover:bg-background/30 transition-colors"
            >
              {bi("فهمت", "Got it")}
            </button>
          </div>
        </div>
      )}

      <div className="h-full w-full flex flex-col items-center justify-center p-8 animate-fade-in relative z-10">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Title */}
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <h2 className="text-lg md:text-xl font-medium text-gray-600">
                {slide.subtitle}
              </h2>
            )}
          </div>

          {/* Content Card */}
          <div className="relative group animate-fade-in">
            {renderSlideContent()}
          </div>
        </div>

        {/* Dots */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === current 
                    ? "w-8 bg-gray-800 shadow-md" 
                    : "w-2 bg-gray-400/50 hover:bg-gray-500/50"
                }`}
                onClick={() => handleDotClick(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Page indicator */}
          <span className="text-gray-600 text-sm">
            {current + 1} / {slides.length}
          </span>
        </div>

        {/* Large circular navigation button */}
        <div className="mt-8">
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl group ${
              canProceed()
                ? 'bg-gray-800 hover:scale-110'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            aria-label={current === slides.length - 1 ? t('onboarding.start') : t('onboarding.next')}
          >
            <ArrowRight className="w-7 h-7 text-white group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Back button for slides after the first */}
        {current > 0 && (
          <button
            onClick={handlePrev}
            className="absolute bottom-8 left-8 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors flex items-center gap-1"
            aria-label="Previous"
          >
            <ChevronRight className={`w-4 h-4 ${bi("", "rotate-180")}`} />
            {bi("السابق", "Back")}
          </button>
        )}
      </div>

      <style>{`
        @keyframes swipe {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(${bi("20px", "-20px")}); opacity: 0.5; }
        }
        @keyframes drawPath {
          from { stroke-dashoffset: 300; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};
