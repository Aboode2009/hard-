import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PathCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  totalDays: number;
  isRecommended?: boolean;
  isActive?: boolean;
  progress?: number;
  onClick: () => void;
}

export const PathCard = ({
  id,
  title,
  description,
  icon,
  totalDays,
  isRecommended,
  isActive,
  progress = 0,
  onClick,
}: PathCardProps) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer rounded-2xl border-2 bg-card p-5 transition-all duration-300",
        isActive
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-border hover:border-primary/50 hover:shadow-lg"
      )}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <Badge className="absolute -top-2 rtl:-right-2 ltr:-left-2 bg-primary text-primary-foreground gap-1 px-2 py-1">
          <Star className="w-3 h-3 fill-current" />
          {t('paths.recommended')}
        </Badge>
      )}

      {/* Active Badge */}
      {isActive && (
        <Badge className="absolute -top-2 rtl:-left-2 ltr:-right-2 bg-green-600 text-white">
          {t('paths.active')}
        </Badge>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "bg-primary/10 text-primary group-hover:bg-primary/20"
        )}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground truncate">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              {totalDays} {t('paths.days')}
            </span>
            {progress > 0 && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-primary font-medium">
                  {Math.round(progress)}% {t('paths.completed')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className={cn(
          "w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1",
          isActive && "text-primary"
        )} />
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
