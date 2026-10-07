import { useCallback, useEffect, useState } from "react";
import {
  fetchBalance,
  fetchSubscriptionDetails,
  isPremiumActive,
  onBalanceChange,
  onPremiumChange,
  onSubscriptionDetailsChange,
  peekBalance,
  peekPremium,
  peekSubscriptionDetails,
  refreshEntitlements,
  type SubscriptionDetails,
} from "@/lib/premium";

/**
 * Premium state for UI. Backed by the shared cache in lib/premium.ts, so every
 * component that calls this hook sees the same value and one refresh updates
 * all of them at once.
 *
 * `isPremium` starts from the cached value when there is one, so navigating
 * between gated pages doesn't flash a lock screen at an actual subscriber.
 *
 * `balance` is the app's single currency (challenge_progress.total_points).
 *
 * `details` says whether the subscription is lifetime and, if monthly, when it
 * ends — display only; `isPremium` remains the access decision.
 */
export function usePremium() {
  const [isPremium, setIsPremium] = useState<boolean>(() => peekPremium() ?? false);
  const [balance, setBalance] = useState<number>(() => peekBalance() ?? 0);
  const [details, setDetails] = useState<SubscriptionDetails>(
    () => peekSubscriptionDetails() ?? { isLifetime: false, premiumUntil: null },
  );
  const [loading, setLoading] = useState<boolean>(() => peekPremium() === null);

  useEffect(() => {
    let alive = true;

    const unsubPremium = onPremiumChange((v) => alive && setIsPremium(v));
    const unsubBalance = onBalanceChange((v) => alive && setBalance(v));
    const unsubDetails = onSubscriptionDetailsChange((v) => alive && setDetails(v));

    void (async () => {
      const [premium, points, subscription] = await Promise.all([
        isPremiumActive(),
        fetchBalance(),
        fetchSubscriptionDetails(),
      ]);
      if (!alive) return;
      setIsPremium(premium);
      setBalance(points);
      setDetails(subscription);
      setLoading(false);
    })();

    return () => {
      alive = false;
      unsubPremium();
      unsubBalance();
      unsubDetails();
    };
  }, []);

  const refresh = useCallback(async () => {
    await refreshEntitlements();
  }, []);

  return {
    isPremium,
    isLifetime: isPremium && details.isLifetime,
    details,
    balance,
    loading,
    refresh,
  };
}
