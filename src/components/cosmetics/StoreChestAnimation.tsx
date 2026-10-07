import { bi } from "@/i18n/bi";
import { ChestCeremony } from "./ChestCeremony";
import type { CosmeticItem } from "./types";

export interface StoreChestReward {
  coins: number;
  item: CosmeticItem | null;
}

interface StoreChestAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  reward: StoreChestReward | null;
}

/** Store treasure chest: guaranteed coins + a possible bonus item. */
export const StoreChestAnimation = ({ isOpen, onClose, reward }: StoreChestAnimationProps) => (
  <ChestCeremony
    isOpen={isOpen && !!reward}
    title={bi("صندوق الكنز", "Treasure Chest")}
    reward={reward}
    onClose={onClose}
  />
);
