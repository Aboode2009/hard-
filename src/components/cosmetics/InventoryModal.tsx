import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CosmeticItem,
  RARITY_LABELS,
  CosmeticType,
  CosmeticRarity,
} from "./types";
import { BadgeArt } from "./BadgeArt";
import { MedalIcon, ChestIcon } from "@/components/nav-icons";
import { DuoThickCheck } from "@/components/icons/DuolingoIcons";
import { LootBoxAnimation } from "./LootBoxAnimation";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";

interface InventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onEquipmentChange?: () => void;
}

const RARITY_HEX: Record<CosmeticRarity, string> = {
  common: "#8FA3AD",
  rare: "#1CB0F6",
  epic: "#CE82FF",
  legendary: "#FFC800",
};

export const InventoryModal = ({
  open,
  onOpenChange,
  userId,
  onEquipmentChange,
}: InventoryModalProps) => {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const isArabic = i18n.language === 'ar';

  const [allItems, setAllItems] = useState<CosmeticItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);
  const [lootBoxes, setLootBoxes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLootBox, setShowLootBox] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [reward, setReward] = useState<CosmeticItem | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchData();
    }
  }, [open, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch only badge items
      const { data: items } = await supabase
        .from("cosmetic_items")
        .select("*")
        .eq("is_active", true)
        .eq("type", "badge");

      // Fetch user inventory
      const { data: userInventory } = await supabase
        .from("user_inventory")
        .select("item_id")
        .eq("user_id", userId);

      // Fetch user profile for equipped badge and loot boxes
      const { data: profile } = await supabase
        .from("profiles")
        .select("equipped_badge_id, loot_boxes")
        .eq("id", userId)
        .single();

      if (items) {
        setAllItems(items.map(item => ({
          ...item,
          type: item.type as CosmeticType,
          rarity: item.rarity as CosmeticRarity,
        })));
      }

      if (userInventory) {
        setInventory(userInventory.map(i => i.item_id));
      }

      if (profile) {
        setEquippedBadge(profile.equipped_badge_id);
        setLootBoxes(profile.loot_boxes || 0);
      }
    } catch (error) {
      console.error("Error fetching cosmetic data:", error);
    } finally {
      setLoading(false);
    }
  };

  const equipItem = async (item: CosmeticItem) => {
    if (!inventory.includes(item.id)) return;

    const isCurrentlyEquipped = equippedBadge === item.id;
    const newValue = isCurrentlyEquipped ? null : item.id;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ equipped_badge_id: newValue })
        .eq("id", userId);

      if (error) throw error;

      setEquippedBadge(newValue);
      onEquipmentChange?.();
      haptic("light");

      toast({
        title: isCurrentlyEquipped
          ? (bi("تم الخلع", "Unequipped"))
          : (bi("تم التجهيز", "Equipped")),
        description: isArabic ? item.name_ar : item.name,
      });
    } catch (error) {
      console.error("Error equipping item:", error);
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: bi("فشل تجهيز العنصر", "Failed to equip item"),
      });
    }
  };

  const openLootBox = async () => {
    if (lootBoxes <= 0 || isOpening) return;

    setIsOpening(true);

    try {
      // Get badge items not owned by user
      const availableItems = allItems.filter(item => !inventory.includes(item.id));

      if (availableItems.length === 0) {
        // All items owned, give random duplicate
        const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
        setReward(randomItem);
      } else {
        // Weighted random selection based on rarity
        const weights = {
          common: 0.50,
          rare: 0.30,
          epic: 0.15,
          legendary: 0.05,
        };

        const weightedItems: CosmeticItem[] = [];
        availableItems.forEach(item => {
          const weight = Math.ceil(weights[item.rarity] * 100);
          for (let i = 0; i < weight; i++) {
            weightedItems.push(item);
          }
        });

        const randomItem = weightedItems[Math.floor(Math.random() * weightedItems.length)];

        // Add to inventory
        await supabase.from("user_inventory").insert({
          user_id: userId,
          item_id: randomItem.id,
        });

        setInventory(prev => [...prev, randomItem.id]);
        setReward(randomItem);
      }

      // Decrement loot boxes
      await supabase
        .from("profiles")
        .update({ loot_boxes: lootBoxes - 1 })
        .eq("id", userId);

      setLootBoxes(prev => prev - 1);
    } catch (error) {
      console.error("Error opening loot box:", error);
      setIsOpening(false);
    }
  };

  const handleLootBoxClose = () => {
    setShowLootBox(false);
    setIsOpening(false);
    setReward(null);
  };

  // Count owned badges
  const ownedCount = allItems.filter(item => inventory.includes(item.id)).length;
  const totalCount = allItems.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="duo-page max-w-md max-h-[85vh] overflow-y-auto" dir={bi("rtl", "ltr")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              <MedalIcon className="w-6 h-6" />
              {bi("شاراتي", "My Badges")}
            </DialogTitle>
          </DialogHeader>

          {/* Collected stats */}
          <div className="duo-card flex items-center justify-between px-4 py-3">
            <span className="text-sm font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("تم جمعها", "Collected")}
            </span>
            <span className="font-extrabold" style={{ color: "#FFC800" }}>
              {ownedCount} / {totalCount}
            </span>
          </div>

          {/* Loot Boxes Section */}
          <AnimatePresence>
            {lootBoxes > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="duo-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-12 h-12"
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ChestIcon className="w-full h-full" />
                    </motion.div>
                    <div>
                      <p className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                        {bi("صناديق الجوائز", "Loot Boxes")}
                      </p>
                      <p className="text-sm font-bold" style={{ color: "#FFC800" }}>
                        {lootBoxes} {bi("صندوق متاح", "available")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLootBox(true)}
                    className="duo-press px-5 h-11 rounded-2xl font-extrabold text-white tracking-wide"
                    style={{ background: "#FFC800", boxShadow: "0 3px 0 #E6A700" }}
                  >
                    {bi("افتح!", "OPEN!")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badges Grid */}
          <div className="mt-2">
            {loading ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
                />
                <p className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                  {bi("جاري التحميل...", "Loading...")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <AnimatePresence>
                  {allItems.map((item, index) => {
                    const owned = inventory.includes(item.id);
                    const isEquipped = equippedBadge === item.id;
                    const rarityColor = RARITY_HEX[item.rarity];

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <button
                          onClick={() => owned && equipItem(item)}
                          className={cn(
                            "relative w-full p-3 rounded-2xl text-center transition-transform",
                            owned ? "duo-press cursor-pointer" : "cursor-default grayscale opacity-60"
                          )}
                          style={{
                            background: "hsl(var(--duo-surface))",
                            border: `2px solid ${owned ? rarityColor : "hsl(var(--duo-border))"}`,
                            boxShadow: `0 3px 0 ${owned ? `${rarityColor}88` : "hsl(var(--duo-edge))"}`,
                            outline: isEquipped ? "3px solid #58CC02" : "none",
                            outlineOffset: "2px",
                          }}
                        >
                          {/* Lock overlay for unowned */}
                          {!owned && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-10" style={{ background: "hsl(var(--duo-surface) / 0.55)" }}>
                              <Lock className="w-6 h-6" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
                            </div>
                          )}

                          {/* Equipped check */}
                          {isEquipped && (
                            <motion.div
                              className="absolute -top-1.5 -end-1.5 w-6 h-6 rounded-full flex items-center justify-center z-20"
                              style={{ background: "#58CC02" }}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <DuoThickCheck className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                          )}

                          {/* Drawn badge icon (replaces the emoji) */}
                          <BadgeArt badge={item.css_class} className="w-11 h-11 mx-auto mb-2" />

                          <p className="text-xs font-extrabold truncate" style={{ color: "hsl(var(--duo-text))" }}>
                            {isArabic ? item.name_ar : item.name}
                          </p>
                          <p className="text-[10px] font-extrabold" style={{ color: rarityColor }}>
                            {isArabic ? RARITY_LABELS[item.rarity].ar : RARITY_LABELS[item.rarity].en}
                          </p>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* How to earn */}
          <div className="duo-card flex items-center justify-center gap-2.5 px-4 py-3 mt-2">
            <ChestIcon className="w-6 h-6 flex-shrink-0" />
            <p className="text-xs font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("أكمل 3 أيام متتالية 100% لتحصل على صندوق!", "Complete 3 consecutive 100% days to earn a box!")}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <LootBoxAnimation
        isOpen={showLootBox}
        onClose={handleLootBoxClose}
        reward={reward}
        onOpenBox={openLootBox}
        isOpening={isOpening}
      />
    </>
  );
};
