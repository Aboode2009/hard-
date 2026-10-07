import { Trophy, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProgressFill } from "@/components/ui/progress-fill";

interface ChallengeHeaderProps {
  currentDay: number;
  totalDays: number;
}

export const ChallengeHeader = ({ currentDay, totalDays }: ChallengeHeaderProps) => {
  const progress = (currentDay / totalDays) * 100;
  const { t } = useTranslation();
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-8 border border-border shadow-lg">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Day Number - Large and prominent */}
        <div className="space-y-2">
          <div className="text-6xl md:text-8xl font-black text-primary tracking-tighter">
            {currentDay}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {t('challenge.day', { current: currentDay })} / {totalDays}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full max-w-md space-y-3">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <ProgressFill value={progress} className="bg-primary rounded-full" duration={1} />
          </div>
          
          <div className="text-sm text-muted-foreground font-medium">
            {totalDays - currentDay} {t('challenge.daysRemaining', { count: totalDays - currentDay })}
          </div>
        </div>
      </div>
    </div>
  );
};