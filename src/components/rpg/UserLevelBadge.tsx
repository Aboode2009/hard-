import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import { BadgeArt } from "@/components/cosmetics/BadgeArt";

interface UserLevelBadgeProps {
  level: number;
  username: string;
  badgeEmoji?: string | null;
  size?: "sm" | "md" | "lg";
  showLevel?: boolean;
  className?: string;
}

export const UserLevelBadge = ({
  level,
  username,
  badgeEmoji,
  size = "md",
  showLevel = true,
  className,
}: UserLevelBadgeProps) => {
  const sizeClasses = {
    sm: {
      container: "gap-1.5",
      level: "w-5 h-5 text-[10px]",
      name: "text-sm",
      badge: "text-xs",
    },
    md: {
      container: "gap-2",
      level: "w-6 h-6 text-xs",
      name: "text-base",
      badge: "text-sm",
    },
    lg: {
      container: "gap-2.5",
      level: "w-8 h-8 text-sm",
      name: "text-lg",
      badge: "text-base",
    },
  };

  const classes = sizeClasses[size];

  // Get level tier for visual styling
  const getLevelTier = (lvl: number) => {
    if (lvl >= 50) return "legendary"; // Gold/Diamond
    if (lvl >= 30) return "epic"; // Purple
    if (lvl >= 15) return "rare"; // Blue
    if (lvl >= 5) return "uncommon"; // Green
    return "common"; // Gray
  };

  const tier = getLevelTier(level);

  const tierStyles = {
    common: "bg-muted border-muted-foreground/30 text-muted-foreground",
    uncommon: "bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400",
    rare: "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400",
    epic: "bg-purple-500/20 border-purple-500/50 text-purple-600 dark:text-purple-400",
    legendary: "bg-gradient-to-br from-yellow-400/30 to-amber-500/30 border-yellow-500/60 text-yellow-600 dark:text-yellow-400 shadow-lg shadow-yellow-500/20",
  };

  return (
    <div className={cn("inline-flex items-center", classes.container, className)}>
      {showLevel && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn(
            "flex-shrink-0 rounded-full border-2 flex items-center justify-center font-bold",
            classes.level,
            tierStyles[tier]
          )}
        >
          {level}
        </motion.div>
      )}
      <span className={cn("font-semibold truncate", classes.name)}>
        {username}
      </span>
      {badgeEmoji && (
        <span className={cn(classes.badge, "inline-flex items-center")}>
          <BadgeArt badge={badgeEmoji} className="w-[1.1em] h-[1.1em]" />
        </span>
      )}
    </div>
  );
};
