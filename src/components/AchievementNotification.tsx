import { useEffect } from "react";
import confetti from "canvas-confetti";
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface AchievementNotificationProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  onClose: () => void;
}

export const AchievementNotification = ({
  icon: Icon,
  title,
  description,
  color,
  onClose,
}: AchievementNotificationProps) => {
  useEffect(() => {
    // Confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    // Auto close after 5 seconds
    const timeout = setTimeout(() => {
      onClose();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto animate-scale-in">
        <Card className="relative overflow-hidden shadow-2xl border-4 max-w-md mx-4" style={{ borderColor: color }}>
          <div
            className="absolute inset-0 opacity-10 animate-shimmer"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            }}
          />
          <div className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center shadow-xl animate-float"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                }}
              >
                <Icon className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                  <h3 className="text-2xl font-bold text-gradient">إنجاز جديد!</h3>
                </div>
                <h4 className="text-xl font-bold mb-1">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-center font-medium text-primary">
                🎉 تهانينا على إنجازك الرائع! استمر في التقدم 🎉
              </p>
            </div>
          </div>
          
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)` }}
          />
        </Card>
      </div>
    </div>
  );
};
