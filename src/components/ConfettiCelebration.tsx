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

    const frame = () => {
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
        requestAnimationFrame(frame);
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

    requestAnimationFrame(frame);
  }, [trigger]);

  return null;
};
