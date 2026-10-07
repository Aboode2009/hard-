import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Loot boxes for every 3 consecutive perfect days are now awarded by the
 * server inside complete_task / complete_custom_task / complete_day (the
 * client can no longer write profiles.loot_boxes). The RPC result carries
 * `loot_box_awarded`; this hook only announces it.
 */
export const useLootBoxReward = () => {
  const { toast } = useToast();

  return useCallback(
    (isArabic: boolean) => {
      toast({
        title: isArabic ? "🎁 صندوق جديد!" : "🎁 New Loot Box!",
        description: isArabic
          ? "أكملت 3 أيام مثالية متتالية! اذهب للمجموعة لفتحه."
          : "You completed 3 perfect days in a row! Go to Collection to open it.",
      });
    },
    [toast],
  );
};
