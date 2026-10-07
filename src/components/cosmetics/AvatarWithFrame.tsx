import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";

import { BadgeArt } from "./BadgeArt";

interface AvatarWithFrameProps {
  /** Built-in avatar (`profiles.avatar_id`); NULL → the gender default. */
  avatarId?: string | null;
  gender?: string | null;
  /** The user id — fixes the circle colour. */
  seed?: string | null;
  username?: string;
  frameClass?: string | null;
  badgeEmoji?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const frameSizeClasses = {
  sm: 'p-0.5',
  md: 'p-0.5',
  lg: 'p-1',
  xl: 'p-1.5',
};

const badgeSizeClasses = {
  sm: 'text-xs -bottom-0.5 -right-0.5',
  md: 'text-sm -bottom-0.5 -right-0.5',
  lg: 'text-base -bottom-1 -right-1',
  xl: 'text-lg -bottom-1 -right-1',
};

// Frame CSS classes with unique visual effects
const frameStyles: Record<string, string> = {
  'frame-iron': 'ring-2 ring-slate-400 dark:ring-slate-500 shadow-md',
  'frame-fire': 'ring-2 ring-orange-500 shadow-orange-500/30 shadow-lg animate-pulse',
  'frame-electric': 'ring-2 ring-cyan-400 shadow-cyan-400/40 shadow-lg',
  'frame-golden': 'ring-3 ring-amber-400 shadow-amber-400/50 shadow-xl bg-gradient-to-br from-amber-200/20 to-amber-600/20',
  'frame-shadow': 'ring-2 ring-violet-600 shadow-violet-600/40 shadow-lg',
  'frame-diamond': 'ring-3 ring-sky-300 shadow-sky-300/50 shadow-xl bg-gradient-to-br from-sky-200/20 to-sky-400/20',
};

export const AvatarWithFrame = ({
  avatarId,
  gender,
  seed,
  username = "User",
  frameClass,
  badgeEmoji,
  size = 'md',
  className,
  onClick,
}: AvatarWithFrameProps) => {
  const frameStyle = frameClass ? frameStyles[frameClass] : '';

  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group",
        onClick && "cursor-pointer hover:scale-105 transition-transform",
        className
      )}
    >
      <div className={cn(
        "rounded-full",
        frameSizeClasses[size],
        frameStyle
      )}>
        <UserAvatar
          avatarId={avatarId}
          gender={gender}
          seed={seed}
          alt={username}
          className={cn(sizeClasses[size], "border-2 border-background")}
        />
      </div>
      
      {/* Badge icon */}
      {badgeEmoji && (
        <span className={cn(
          "absolute",
          badgeSizeClasses[size]
        )}>
          <BadgeArt badge={badgeEmoji} className="w-[1.15em] h-[1.15em]" />
        </span>
      )}
    </button>
  );
};
