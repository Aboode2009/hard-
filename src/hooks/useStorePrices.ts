import { useEffect, useState } from "react";
import { APPLE_PRODUCT, isAppleStore, loadAppleProducts } from "@/lib/apple-iap";

/** App Store prices, already formatted in the buyer's currency ("$4.99", "٤٫٩٩ US$"). */
export interface StorePrices {
  premium?: string;
  lifetime?: string;
  /** Keyed by the number of 100-point packs, as PointPacks offers them. */
  coins: Record<number, string | undefined>;
}

/**
 * On iOS, the prices to show next to each purchase: Apple requires the price
 * the App Store will actually charge, not the dinar prices of WAYL.
 *
 * Returns `null` off iOS (callers keep showing dinars) and an object with
 * missing entries while loading or for a product App Store Connect lacks.
 */
export function useStorePrices(): StorePrices | null {
  const [prices, setPrices] = useState<StorePrices | null>(isAppleStore ? { coins: {} } : null);

  useEffect(() => {
    if (!isAppleStore) return;
    let live = true;
    void loadAppleProducts().then((products) => {
      if (!live) return;
      const price = (id: string) => products[id]?.priceString;
      setPrices({
        premium: price(APPLE_PRODUCT.premium),
        lifetime: price(APPLE_PRODUCT.lifetime),
        coins: Object.fromEntries(Object.entries(APPLE_PRODUCT.coins).map(([packs, id]) => [Number(packs), price(id)])),
      });
    });
    return () => {
      live = false;
    };
  }, []);

  return prices;
}
