import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { avatarBackground, resolveAvatar } from "@/lib/avatars";

interface UserAvatarProps {
  /** `profiles.avatar_id`; NULL/undefined falls back to the gender default. */
  avatarId?: string | null;
  gender?: string | null;
  /** Picks the circle colour (the user id, so it never changes). */
  seed?: string | null;
  /** Size and any ring come from the caller. */
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

/** A user's built-in avatar: their character on their colour, in a circle. */
export const UserAvatar = ({ avatarId, gender, seed, className, style, alt = "" }: UserAvatarProps) => {
  const avatar = resolveAvatar(avatarId, gender);
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-full", className)}
      style={{ background: avatarBackground(seed), ...style }}
    >
      <img
        src={avatar.src}
        alt={alt}
        draggable={false}
        decoding="async"
        className="block h-full w-full select-none"
      />
    </span>
  );
};
