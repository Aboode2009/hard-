import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";
import { Rocket } from "lucide-react";

interface EmptyTasksStateProps {
  onAddClick?: () => void;
}

export const EmptyTasksState = ({ onAddClick }: EmptyTasksStateProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      {/* Rocket Illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
          <Rocket className="w-16 h-16 text-primary/60" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-2 h-2 rounded-full bg-primary/40" />
        <div className="absolute top-4 -left-4 w-3 h-3 rounded-full bg-primary/30" />
        <div className="absolute -bottom-1 right-4 w-1.5 h-1.5 rounded-full bg-primary/50" />
        <div className="absolute top-1/2 -right-6 w-1 h-1 rounded-full bg-primary/60" />
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-muted-foreground mb-2">
        {bi("لا توجد مهام", "No Habits")}
      </h3>
      <p className="text-muted-foreground text-center">
        {bi("اضغط على \"+\" لإضافة أول مهمة", "Tap \"+\" to add your first habit.")
        }
      </p>
    </div>
  );
};
