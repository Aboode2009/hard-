import { useState, useEffect, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit, X, Upload, Package } from "lucide-react";
import { DuoFreeze, DuoGem } from "@/components/icons/DuolingoIcons";
import { ChestIcon } from "@/components/nav-icons";
import { StoreChestAnimation, type StoreChestReward } from "@/components/cosmetics/StoreChestAnimation";
import type { CosmeticItem, CosmeticRarity, CosmeticType } from "@/components/cosmetics/types";
import { BottomNav } from "@/components/BottomNav";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  sizes: string[] | null;
  is_active: boolean;
  stock: number | null;
}

const FREEZE_PRICE = 200;
const FREEZE_MAX = 2;

const CHEST_PRICE = 50;

// Guaranteed coin drop: bigger amounts are rarer (weights sum to 100)
const COIN_TIERS: { amount: number; weight: number }[] = [
  { amount: 10, weight: 30 },
  { amount: 20, weight: 25 },
  { amount: 30, weight: 18 },
  { amount: 40, weight: 12 },
  { amount: 50, weight: 8 },
  { amount: 75, weight: 5 },
  { amount: 100, weight: 2 },
];

const rollCoins = (): number => {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const tier of COIN_TIERS) {
    cumulative += tier.weight;
    if (roll < cumulative) return tier.amount;
  }
  return COIN_TIERS[0].amount;
};

// Bonus cosmetic drop (themes & badges only, NOT guaranteed)
const BONUS_ITEM_CHANCE = 0.25;

const rollRarity = (): CosmeticRarity => {
  const roll = Math.random();
  if (roll < 0.55) return "common";
  if (roll < 0.82) return "rare";
  if (roll < 0.95) return "epic";
  return "legendary";
};

const Store = () => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  // Power-ups state
  const [totalPoints, setTotalPoints] = useState(0);
  const [streakFreezes, setStreakFreezes] = useState(0);
  const [buying, setBuying] = useState(false);

  // Treasure chest state
  const [openingChest, setOpeningChest] = useState(false);
  const [chestReward, setChestReward] = useState<StoreChestReward | null>(null);
  const [showChestAnim, setShowChestAnim] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    price: 0,
    image_url: "",
    category: "general",
    sizes: "",
    is_active: true,
    stock: 0,
  });

  const fetchBalance = useCallback(async () => {
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setTotalPoints(data.total_points || 0);
      setStreakFreezes(data.streak_freezes ?? 0);
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
    fetchProducts();
    fetchBalance();
  }, [fetchBalance]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) return;

    const { data } = await supabase.rpc("is_admin");
    setIsAdmin(data === true);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("store_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleBuyFreeze = async () => {
    if (buying || streakFreezes >= FREEZE_MAX) return;

    if (totalPoints < FREEZE_PRICE) {
      toast({
        variant: "destructive",
        title: bi("نقاط غير كافية", "Not enough points"),
        description: isArabic
          ? `تحتاج ${FREEZE_PRICE} نقطة لشراء درع التجميد`
          : `You need ${FREEZE_PRICE} points to get a Streak Freeze`,
      });
      return;
    }

    setBuying(true);
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) {
      setBuying(false);
      return;
    }

    const { error } = await supabase
      .from("challenge_progress")
      .update({
        total_points: totalPoints - FREEZE_PRICE,
        streak_freezes: streakFreezes + 1,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: bi("فشل الشراء", "Purchase failed"),
        description: error.message,
      });
    } else {
      setTotalPoints((p) => p - FREEZE_PRICE);
      setStreakFreezes((n) => n + 1);
      haptic("medium");
      toast({
        title: bi("تم تجهيز درع التجميد", "Streak Freeze equipped"),
        description: bi("سيحمي ستريكك تلقائيًا عند تفويت يوم", "It will automatically protect your streak if you miss a day"),
      });
    }
    setBuying(false);
  };

  const handleBuyChest = async () => {
    if (openingChest) return;

    if (totalPoints < CHEST_PRICE) {
      toast({
        variant: "destructive",
        title: bi("عملات غير كافية", "Not enough coins"),
        description: isArabic
          ? `تحتاج ${CHEST_PRICE} عملة لشراء الصندوق`
          : `You need ${CHEST_PRICE} coins to buy the chest`,
      });
      return;
    }

    setOpeningChest(true);
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) {
      setOpeningChest(false);
      return;
    }

    // Guaranteed coins (weighted — big wins are rare)
    const coins = rollCoins();

    // Bonus theme/badge drop (luck only)
    let item: CosmeticItem | null = null;
    if (Math.random() < BONUS_ITEM_CHANCE) {
      const rarity = rollRarity();
      const { data: items } = await supabase
        .from("cosmetic_items")
        .select("*")
        .eq("rarity", rarity)
        .eq("is_active", true)
        .in("type", ["theme", "badge"]);

      if (items && items.length > 0) {
        const { data: inv } = await supabase
          .from("user_inventory")
          .select("item_id")
          .eq("user_id", user.id);
        const owned = new Set(inv?.map((i) => i.item_id) || []);
        let pool = items.filter((i) => !owned.has(i.id));
        if (pool.length === 0) pool = items;
        const selected = pool[Math.floor(Math.random() * pool.length)];

        const { error: invError } = await supabase
          .from("user_inventory")
          .insert({ user_id: user.id, item_id: selected.id });

        if (!invError) {
          item = {
            ...selected,
            type: selected.type as CosmeticType,
            rarity: selected.rarity as CosmeticRarity,
          };
        }
      }
    }

    // Pay for the chest and bank the won coins in one update
    const { error } = await supabase
      .from("challenge_progress")
      .update({ total_points: totalPoints - CHEST_PRICE + coins })
      .eq("user_id", user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: bi("فشل الشراء", "Purchase failed"),
        description: error.message,
      });
      setOpeningChest(false);
      return;
    }

    setTotalPoints((p) => p - CHEST_PRICE + coins);
    setChestReward({ coins, item });
    setShowChestAnim(true);
    setOpeningChest(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      description: "",
      description_ar: "",
      price: 0,
      image_url: "",
      category: "general",
      sizes: "",
      is_active: true,
      stock: 0,
    });
    setEditingProduct(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: bi("فشل في رفع الصورة", "Failed to upload image"),
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    setFormData({ ...formData, image_url: publicUrl });
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.name_ar || formData.price <= 0) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: bi("يرجى ملء جميع الحقول المطلوبة", "Please fill all required fields"),
      });
      return;
    }

    const productData = {
      name: formData.name,
      name_ar: formData.name_ar,
      description: formData.description || null,
      description_ar: formData.description_ar || null,
      price: formData.price,
      image_url: formData.image_url || null,
      category: formData.category,
      sizes: formData.sizes ? formData.sizes.split(",").map(s => s.trim()).filter(Boolean) : null,
      is_active: formData.is_active,
      stock: formData.stock,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("store_products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast({
          variant: "destructive",
          title: bi("خطأ", "Error"),
          description: error.message,
        });
        return;
      }

      toast({
        title: bi("تم التحديث", "Updated"),
        description: bi("تم تحديث المنتج بنجاح", "Product updated successfully"),
      });
    } else {
      const { error } = await supabase
        .from("store_products")
        .insert(productData);

      if (error) {
        toast({
          variant: "destructive",
          title: bi("خطأ", "Error"),
          description: error.message,
        });
        return;
      }

      toast({
        title: bi("تمت الإضافة", "Added"),
        description: bi("تمت إضافة المنتج بنجاح", "Product added successfully"),
      });
    }

    setShowAddDialog(false);
    resetForm();
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      name_ar: product.name_ar,
      description: product.description || "",
      description_ar: product.description_ar || "",
      price: product.price,
      image_url: product.image_url || "",
      category: product.category || "general",
      sizes: product.sizes?.join(", ") || "",
      is_active: product.is_active,
      stock: product.stock || 0,
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("store_products")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: error.message,
      });
      return;
    }

    toast({
      title: bi("تم الحذف", "Deleted"),
      description: bi("تم حذف المنتج", "Product deleted"),
    });
    fetchProducts();
  };

  const freezeFull = streakFreezes >= FREEZE_MAX;
  const freezeAffordable = totalPoints >= FREEZE_PRICE;

  return (
    <div className="duo-page min-h-screen bg-background pb-28" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic ? (
              <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            ) : (
              <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            )}
          </button>

          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("المتجر", "Store")}
          </h1>

          {/* Points balance */}
          <div
            className="duo-card flex items-center gap-1.5 px-3 h-11"
            style={{ borderRadius: "1rem" }}
          >
            <DuoGem className="w-5 h-5" />
            <span className="font-extrabold text-base" style={{ color: "#1CB0F6" }}>
              {totalPoints}
            </span>
          </div>
        </div>

        {/* ===== Power-Ups (Duolingo style) ===== */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("التعزيزات", "Power-Ups")}
          </h2>
          <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

          {/* Streak Freeze item */}
          <div className="flex items-start gap-4">
            <DuoFreeze className="w-20 h-20 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-extrabold leading-tight" style={{ color: "hsl(var(--duo-text))" }}>
                {bi("تجميد الستريك", "Streak Freeze")}
              </h3>
              <p className="text-sm font-medium mt-1 leading-relaxed" style={{ color: "hsl(var(--duo-muted))" }}>
                {bi("يسمح تجميد الستريك ببقاء ستريكك محفوظًا ليوم كامل من عدم النشاط.", "Streak Freeze allows your streak to remain in place for one full day of inactivity.")}
              </p>

              {/* Equipped pill */}
              <div className="mt-3">
                <span
                  className="inline-block px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wider"
                  style={{
                    background: "hsl(var(--duo-border) / 0.6)",
                    color: "hsl(var(--duo-muted))",
                  }}
                >
                  {streakFreezes} / {FREEZE_MAX} {bi("مُجَهَّز", "EQUIPPED")}
                </span>
              </div>

              {/* Get button */}
              <button
                onClick={handleBuyFreeze}
                disabled={freezeFull || buying}
                className="duo-press mt-4 inline-flex items-center gap-2 h-12 px-5 rounded-2xl font-extrabold text-sm tracking-wide disabled:cursor-not-allowed"
                style={{
                  background: "hsl(var(--duo-surface))",
                  border: "2px solid hsl(var(--duo-border))",
                  boxShadow: "0 3px 0 hsl(var(--duo-edge))",
                  color: "#1CB0F6",
                  opacity: freezeFull || (!freezeAffordable && !buying) ? 0.5 : 1,
                }}
              >
                {freezeFull ? (
                  bi("مُجَهَّز بالكامل", "FULLY EQUIPPED")
                ) : (
                  <>
                    {bi("احصل عليه مقابل:", "GET FOR:")}
                    <DuoGem className="w-6 h-6" />
                    {FREEZE_PRICE}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Treasure Chest item */}
          <div className="flex items-start gap-4 mt-7">
            <ChestIcon className="w-20 h-20 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-extrabold leading-tight" style={{ color: "hsl(var(--duo-text))" }}>
                {bi("صندوق الكنز", "Treasure Chest")}
              </h3>
              <p className="text-sm font-medium mt-1 leading-relaxed" style={{ color: "hsl(var(--duo-muted))" }}>
                {bi("عملات مضمونة من 10 إلى 100 — وكلما كبر المبلغ قلّ حظه، مع فرصة للفوز بثيمات وشارات نادرة.", "Guaranteed 10–100 coins — bigger wins are rarer, plus a chance at rare themes and badges.")}
              </p>

              <button
                onClick={handleBuyChest}
                disabled={openingChest}
                className="duo-press mt-4 inline-flex items-center gap-2 h-12 px-5 rounded-2xl font-extrabold text-sm tracking-wide disabled:cursor-not-allowed"
                style={{
                  background: "hsl(var(--duo-surface))",
                  border: "2px solid hsl(var(--duo-border))",
                  boxShadow: "0 3px 0 hsl(var(--duo-edge))",
                  color: "#1CB0F6",
                  opacity: openingChest || totalPoints < CHEST_PRICE ? 0.5 : 1,
                }}
              >
                {bi("احصل عليه مقابل:", "GET FOR:")}
                <DuoGem className="w-6 h-6" />
                {CHEST_PRICE}
              </button>
            </div>
          </div>
        </section>

        {/* ===== Products ===== */}
        {isAdmin ? (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                {bi("إدارة المنتجات", "Manage Products")}
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddDialog(true);
                }}
                className="duo-press w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: "#58CC02", boxShadow: "0 3px 0 #45a302" }}
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : products.length === 0 ? (
              <div className="duo-card p-8 flex flex-col items-center text-center">
                <Package className="w-10 h-10 mb-3" style={{ color: "hsl(var(--duo-muted))" }} />
                <p className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                  {bi("لا توجد منتجات بعد", "No products yet")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="duo-card p-4" style={{ opacity: product.is_active ? 1 : 0.55 }}>
                    <div className="flex gap-4">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={isArabic ? product.name_ar : product.name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div
                          className="w-20 h-20 rounded-xl flex items-center justify-center"
                          style={{ background: "hsl(var(--duo-border) / 0.5)" }}
                        >
                          <Package className="w-8 h-8" style={{ color: "hsl(var(--duo-muted))" }} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                              {isArabic ? product.name_ar : product.name}
                            </h3>
                            <p className="text-sm font-medium line-clamp-2" style={{ color: "hsl(var(--duo-muted))" }}>
                              {isArabic ? product.description_ar : product.description}
                            </p>
                          </div>
                          {!product.is_active && (
                            <span
                              className="text-xs px-2 py-1 rounded-full font-bold flex-shrink-0"
                              style={{ background: "hsl(var(--duo-border) / 0.6)", color: "hsl(var(--duo-muted))" }}
                            >
                              {bi("غير نشط", "Inactive")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <DuoGem className="w-5 h-5" />
                            <span className="font-extrabold" style={{ color: "#1CB0F6" }}>{product.price}</span>
                          </div>

                          {product.sizes && product.sizes.length > 0 && (
                            <span className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                              {bi("المقاسات:", "Sizes:")} {product.sizes.join(", ")}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {bi("المكافآت", "Rewards")}
            </h2>
            <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />
            <div className="duo-card p-6 flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#FFC80022" }}
              >
                <Package className="w-7 h-7" style={{ color: "#FFC800" }} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                  {bi("قريبًا...", "Coming Soon...")}
                </h3>
                <p className="text-sm font-medium mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                  {bi("مكافآت حصرية بانتظارك، ترقّب المفاجآت", "Exclusive rewards await you. Stay tuned!")}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Add/Edit Product Dialog (admin) */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? (bi("تعديل المنتج", "Edit Product"))
                : (bi("إضافة منتج جديد", "Add New Product"))}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{bi("الاسم (EN)", "Name (EN)")}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label>{bi("الاسم (AR)", "Name (AR)")}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="اسم المنتج"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{bi("الوصف (EN)", "Description (EN)")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
              />
            </div>

            <div className="space-y-2">
              <Label>{bi("الوصف (AR)", "Description (AR)")}</Label>
              <Textarea
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                placeholder="وصف المنتج"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{bi("السعر (نقاط)", "Price (points)")}</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>{bi("المخزون", "Stock")}</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{bi("المقاسات (اختياري - للملابس)", "Sizes (optional - for clothing)")}</Label>
              <Input
                value={formData.sizes}
                onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                placeholder="S, M, L, XL"
              />
              <p className="text-xs text-muted-foreground">
                {bi("افصل بين المقاسات بفاصلة", "Separate sizes with comma")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{bi("صورة المنتج", "Product Image")}</Label>
              {formData.image_url && (
                <div className="relative w-full h-40 rounded-xl overflow-hidden mb-2">
                  <img
                    src={formData.image_url}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, image_url: "" })}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("image-upload")?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading
                    ? (bi("جاري الرفع...", "Uploading..."))
                    : (bi("رفع صورة", "Upload Image"))}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>{bi("نشط", "Active")}</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
                className="flex-1"
              >
                {bi("إلغاء", "Cancel")}
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingProduct
                  ? (bi("تحديث", "Update"))
                  : (bi("إضافة", "Add"))}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Treasure chest opening ceremony */}
      <StoreChestAnimation
        isOpen={showChestAnim}
        onClose={() => {
          setShowChestAnim(false);
          setChestReward(null);
        }}
        reward={chestReward}
      />

      <BottomNav />
    </div>
  );
};

export default Store;
