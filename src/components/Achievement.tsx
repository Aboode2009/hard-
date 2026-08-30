import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AchievementProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isUnlocked: boolean;
  progress?: number;
  color: string;
}

export const Achievement = ({
  icon: Icon,
  title,
  description,
  isUnlocked,
  progress = 0,
  color,
}: AchievementProps) => {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        isUnlocked
          ? "card-premium hover-lift cursor-pointer"
          : "opacity-50 cursor-not-allowed"
      )}
    >
      {isUnlocked && (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, transparent 100%)`,
          }}
        />
      )}
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
              isUnlocked
                ? "shadow-lg animate-scale-in"
                : "bg-muted"
            )}
            style={{
              background: isUnlocked
                ? `linear-gradient(135deg, ${color}, ${color}dd)`
                : undefined,
            }}
          >
            <Icon
              className={cn(
                "h-8 w-8",
                isUnlocked ? "text-white" : "text-muted-foreground"
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-bold text-lg mb-1",
                isUnlocked ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{description}</p>

            {!isUnlocked && progress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>التقدم</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                    }}
                  />
                </div>
              </div>
            )}

            {isUnlocked && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-500">
                  تم الإنجاز!
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
