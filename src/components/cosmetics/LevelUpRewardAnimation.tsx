import { bi } from "@/i18n/bi";
import { ChestCeremony } from "./ChestCeremony";
import type { CosmeticItem } from "./types";

interface LevelUpRewardAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  reward: CosmeticItem | null;
  bonusPoints: number;
  level: number;
}

const LEVEL_UP_SOUND = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3";

/** Level-up chest: the new level's item, plus any bonus points. */
export const LevelUpRewardAnimation = ({
  isOpen,
  onClose,
  reward,
  bonusPoints,
  level,
}: LevelUpRewardAnimationProps) => (
  <ChestCeremony
    isOpen={isOpen}
    kicker={bi("مستوى جديد", "LEVEL UP")}
    title={bi(`المستوى ${level}`, `Level ${level}`)}
    reward={{ coins: bonusPoints, item: reward }}
    introSound={LEVEL_UP_SOUND}
    onClose={onClose}
  />
);
