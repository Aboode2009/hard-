import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { bi } from "@/i18n/bi";
import { adsAvailable, showRewardedAd } from "@/lib/ads";
import { usePremium } from "@/hooks/usePremium";

/**
 * "Watch an ad for points" behaviour, shared by the Points and Store pages.
 *
 * The reward is granted exclusively by the server: we only tell it that AdMob
 * confirmed the user earned the reward, then show whatever message comes back.
 * The UI never adds points itself.
 */
export function useRewardedAd(source: "points_page" | "store_page", onGranted?: () => void) {
  const [watching, setWatching] = useState(false);
  const { toast } = useToast();

  // Subscribers are ad-free, so there is no "watch an ad" offer for them.
  // lib/ads.ts refuses to show the ad as well; this hides the button.
  const { isPremium } = usePremium();
  const canWatchAds = adsAvailable && !isPremium;

  const watchAd = useCallback(async () => {
    if (watching || !canWatchAds) return;
    setWatching(true);

    try {
      const outcome = await showRewardedAd();

      if (outcome !== "earned") {
        // Closing early is a normal user choice, not an error worth alarming
        // about; a genuinely unavailable ad does deserve a message.
        if (outcome !== "dismissed") {
          toast({
            title: bi("الإعلان غير متاح", "Ad unavailable"),
            description: bi(
              "تعذّر تحميل الإعلان الآن، حاول بعد قليل.",
              "Couldn't load an ad right now, please try again shortly.",
            ),
            variant: "destructive",
          });
        }
        return;
      }

      // The server owns all reward logic (amount, daily cap).
      const { data, error } = await supabase.rpc("grant_ad_reward", { p_source: source });
      if (error) throw error;

      const row = data?.[0];
      if (!row) throw new Error("Empty grant_ad_reward response");

      // The server's message is Arabic and display-ready in both cases
      // (granted, or daily limit reached).
      toast({
        title: row.success
          ? bi("أحسنت!", "Nice!")
          : bi("لم تُمنح المكافأة", "No reward granted"),
        description: row.message,
        variant: row.success ? undefined : "destructive",
      });

      if (row.success) onGranted?.();
    } catch (err) {
      console.error("grant_ad_reward failed:", err);
      toast({
        title: bi("تعذّر منح المكافأة", "Couldn't grant the reward"),
        description: bi("حدث خطأ، حاول مرة أخرى.", "Something went wrong, please try again."),
        variant: "destructive",
      });
    } finally {
      setWatching(false);
    }
  }, [canWatchAds, onGranted, source, toast, watching]);

  return { watchAd, watching, adsAvailable, canWatchAds };
}
