import { cn } from "@/lib/utils";
import { BadgeArt } from "./BadgeArt";

interface UsernameWithBadgeProps {
  username: string;
  badgeEmoji?: string | null;
  className?: string;
}

export const UsernameWithBadge = ({
  username,
  badgeEmoji,
  className,
}: UsernameWithBadgeProps) => {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {username}
      {badgeEmoji && <BadgeArt badge={badgeEmoji} className="w-4 h-4 flex-shrink-0" />}
    </span>
  );
};
