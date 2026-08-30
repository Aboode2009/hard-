import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

// Brand pink from the app logo ("21" inside a circular arrow).
const PINK = "#FF4D8A";
const PINK_LIGHT = "#FF7FAB";

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * App-startup animation: the "21" drops from the sky, lands in the center
 * with an impact pulse, then the circular arrow draws itself around it —
 * recreating the logo. Shown once per app launch (mounted in App, not per
 * route), then fades out.
 */
export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [show, setShow] = useState(true);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    // The spring lands visually around ~0.6s; start the arrow + impact then.
    const landTimer = setTimeout(() => {
      setLanded(true);
      haptic("medium");
    }, 620);
    const exitTimer = setTimeout(() => setShow(false), 2400);
    return () => {
      clearTimeout(landTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          style={{ background: "#070608" }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.45, ease: "easeIn" }}
        >
          {/* Ambient pink glow behind the logo */}
          <div
            className="pointer-events-none absolute w-[420px] h-[420px] rounded-full"
            style={{ background: `radial-gradient(circle, ${PINK}2e 0%, transparent 65%)` }}
          />

          <div className="relative" style={{ width: 250, height: 250 }}>
            {/* Circular arrow — draws itself around the landed 21 */}
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 w-full h-full"
              style={{ filter: `drop-shadow(0 0 16px ${PINK}59)` }}
            >
              {/* start at -30° (top-right gap), sweep 300° clockwise, end at top */}
              <motion.path
                d="M 165.8 62 A 76 76 0 1 1 100 24"
                fill="none"
                stroke={PINK}
                strokeWidth="15"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={landed ? { pathLength: 1, opacity: 1 } : {}}
                transition={{
                  pathLength: { duration: 0.85, ease: "easeInOut" },
                  opacity: { duration: 0.01 },
                }}
              />
              {/* Arrowhead pops in where the stroke ends (top, pointing clockwise) */}
              <motion.polygon
                points="96,4 96,44 132,24"
                fill={PINK}
                style={{ transformBox: "fill-box", transformOrigin: "left center" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={landed ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 0.82, type: "spring", stiffness: 480, damping: 18 }}
              />
            </svg>

            {/* Impact pulse when the number lands */}
            {landed && (
              <motion.div
                className="absolute inset-0 m-auto rounded-full"
                style={{ width: 170, height: 170, border: `3px solid ${PINK}` }}
                initial={{ scale: 0.4, opacity: 0.7 }}
                animate={{ scale: 1.55, opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            )}

            {/* The falling 21 */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ y: "-58vh", rotate: -12 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 230, damping: 15, mass: 1.1 }}
            >
              <span
                className="select-none italic font-black leading-none"
                style={{
                  fontSize: 96,
                  letterSpacing: "-0.06em",
                  background: `linear-gradient(160deg, ${PINK_LIGHT} 10%, ${PINK} 70%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow: "none",
                  filter: `drop-shadow(0 0 22px ${PINK}47)`,
                }}
              >
                21
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
