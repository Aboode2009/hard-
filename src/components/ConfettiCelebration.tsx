import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiCelebrationProps {
  trigger: boolean;
}

export const ConfettiCelebration = ({ trigger }: ConfettiCelebrationProps) => {
  useEffect(() => {
    if (!trigger) return;

    const duration = 2500;
    const end = Date.now() + duration;
    let rafId = 0;
    let cancelled = false;

    const frame = () => {
      if (cancelled) return;
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["hsl(350, 80%, 60%)", "#FFD700", "#FF6B6B", "#4ECDC4"],
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["hsl(350, 80%, 60%)", "#FFD700", "#FF6B6B", "#4ECDC4"],
        zIndex: 9999,
      });

      if (Date.now() < end) {
        rafId = requestAnimationFrame(frame);
      }
    };

    // Big burst first
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors: ["hsl(350, 80%, 60%)", "#FFD700", "#FF6B6B", "#4ECDC4"],
      zIndex: 9999,
    });

    rafId = requestAnimationFrame(frame);

    // The loop outlived the component before this: navigating away mid-burst
    // left it firing confetti for the full 2.5s against a dead tree.
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [trigger]);

  return null;
};
