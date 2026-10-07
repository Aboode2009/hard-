import { useState, useEffect, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { PointPacks } from "@/components/PointPacks";
import { onBalanceChange } from "@/lib/premium";
import { REWARDED_POINTS_HINT } from "@/config/ads";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit, X, Upload, Package, Play } from "lucide-react";
import { DuoFreeze, DuoGem } from "@/components/icons/DuolingoIcons";
import { ChestIcon } from "@/components/nav-icons";
import { StoreChestAnimation, type StoreChestReward } from "@/components/cosmetics/StoreChestAnimation";
import type { CosmeticItem, CosmeticRarity, CosmeticType } from "@/components/cosmetics/types";
import { BottomNav } from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { useSessionUserId } from "@/lib/session-user";
import { isAdminQuery, progressQuery, storeProductsQuery } from "@/lib/queries";
import { invalidateProgress } from "@/lib/query-client";
import { challengeRpc, rpcErrorText } from "@/lib/challenge-rpc";
import { ProductTour } from "@/components/ProductTour";
import { storeTourSteps, usePageTour } from "@/lib/page-tours";
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

// Chest odds (coins 10–100, 25% cosmetic drop) live on the server in
// open_chest(); the client only shows the result.

const Store = () => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();
  const { toast } = useToast();

  const uid = useSessionUserId();
  // Cached across visits; a revisit shows the balance and items at once and
  // refreshes them in the background. The three reads run in parallel.
  const progressQ = useQuery(progressQuery(uid));
  const adminQ = useQuery(isAdminQuery(uid));
  const productsQ = useQuery(storeProductsQuery());
  const isAdmin = adminQ.data === true;
  const products: Product[] = productsQ.data ?? [];
  const loading = productsQ.isPending;
  // First visit only, once the store's content is on screen.
  const tour = usePageTour("store", !progressQ.isPending);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  // Power-ups state
  const [totalPoints, setTotalPoints] = useState(() => progressQ.data?.total_points ?? 0);
  // A purchase is credited server-side by the WAYL webhook, so when the app
  // comes back to the foreground EntitlementsRefresher re-reads the balance
  // and broadcasts it here — otherwise this screen would keep showing the
  // pre-purchase total until the user navigated away and back.
  useEffect(() => onBalanceChange(setTotalPoints), []);

  const [streakFreezes, setStreakFreezes] = useState(() => progressQ.data?.streak_freezes ?? 0);

  // Follow the server row whenever it (re)loads.
  useEffect(() => {
    if (!progressQ.data) return;
    setTotalPoints(progressQ.data.total_points || 0);
    setStreakFreezes(progressQ.data.streak_freezes ?? 0);
  }, [progressQ.data]);
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

  const fetchBalance = useCallback(() => {
    invalidateProgress();
  }, []);

  // "Watch an ad for points" — grant_ad_reward runs server-side; we only
  // refresh the balance. Hidden on web, where AdMob has no implementation.
  const { watchAd, watching, canWatchAds } = useRewardedAd("store_page", () => {
    void fetchBalance();
  });

  const fetchProducts = () => {
    void productsQ.refetch();
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
    try {
      // Price, cap and balance are all checked by the server.
      const result = await challengeRpc.buyStreakFreeze();
      setTotalPoints(result.total_points);
      setStreakFreezes(result.streak_freezes);
      invalidateProgress();
      haptic("medium");
      toast({
        title: bi("تم تجهيز درع التجميد", "Streak Freeze equipped"),
        description: bi("سيحمي ستريكك تلقائيًا عند تفويت يوم", "It will automatically protect your streak if you miss a day"),
      });
    } catch (err) {
      const [ar, en] = rpcErrorText(err);
      toast({
        variant: "destructive",
        title: bi("فشل الشراء", "Purchase failed"),
        description: bi(ar, en),
      });
      invalidateProgress();
    } finally {
      setBuying(false);
    }
  };

  const handleBuyChest = async () => {
    if (openingChest) return;

    if (totalPoints < CHEST_PRICE) {
      toast({
        variant: "destructive",
        title: bi("نقاط غير كافية", "Not enough points"),
        description: isArabic
          ? `تحتاج ${CHEST_PRICE} نقطة لشراء الصندوق`
          : `You need ${CHEST_PRICE} points to buy the chest`,
      });
      return;
    }

    setOpeningChest(true);

    // Every await below can throw (auth, network, RLS). Without a try/finally
    // a single rejection left `openingChest` stuck true and the chest button
    // permanently dead, which read to users as the app freezing.
    try {
      // The server charges the chest, rolls the coins and the optional
      // cosmetic, and returns what was won.
      const result = await challengeRpc.openChest();
      const item: CosmeticItem | null = result.item
        ? {
            ...result.item,
            type: result.item.type as CosmeticType,
            rarity: result.item.rarity as CosmeticRarity,
          }
        : null;

      setTotalPoints(result.total_points);
      invalidateProgress();
      setChestReward({ coins: result.coins, item });
      setShowChestAnim(true);
    } catch (err) {
      console.error("Chest purchase failed:", err);
      const [ar, en] = rpcErrorText(err);
      toast({
        variant: "destructive",
        title: bi("فشل الشراء", "Purchase failed"),
        description: bi(ar, en),
      });
    } finally {
      // Always released, so the button can never be left disabled.
      setOpeningChest(false);
    }
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

          {/* Balance — the app has exactly one currency. */}
          <div className="flex items-center gap-2">
            <div
              className="duo-card flex items-center gap-1.5 px-2.5 h-11"
              style={{ borderRadius: "1rem" }}
              data-tour="store-balance"
            >
              <DuoGem className="w-5 h-5" />
              <span className="font-extrabold text-sm" style={{ color: "#1CB0F6" }}>
                {totalPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Rewarded ad — native only; the server decides the actual reward */}
        {canWatchAds && (
          <button
            type="button"
            onClick={watchAd}
            disabled={watching}
            className="duo-press mb-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold text-white disabled:opacity-60"
            style={{ background: "#FFC800", boxShadow: "0 4px 0 #D9A800" }}
          >
            <Play className="h-5 w-5" strokeWidth={3} />
            {watching
              ? bi("جارٍ تشغيل الإعلان…", "Playing ad…")
              : bi(
                  `شاهد إعلان واحصل على ${REWARDED_POINTS_HINT} نقطة`,
                  `Watch an ad for ${REWARDED_POINTS_HINT} points`,
                )}
          </button>
        )}

        {/* ===== Buy points (WAYL checkout) ===== */}
        <div data-tour="store-packs">
          <PointPacks className="mb-8" />
        </div>

        {/* ===== Power-Ups (Duolingo style) ===== */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("التعزيزات", "Power-Ups")}
          </h2>
          <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

          {/* Streak Freeze item */}
          <div className="flex items-start gap-4" data-tour="store-freeze">
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
                  <span dir="ltr">{streakFreezes} / {FREEZE_MAX}</span> {bi("مُجَهَّز", "EQUIPPED")}
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
          <div className="flex items-start gap-4 mt-7" data-tour="store-chest">
            <ChestIcon className="w-20 h-20 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-extrabold leading-tight" style={{ color: "hsl(var(--duo-text))" }}>
                {bi("صندوق الكنز", "Treasure Chest")}
              </h3>
              <p className="text-sm font-medium mt-1 leading-relaxed" style={{ color: "hsl(var(--duo-muted))" }}>
                {bi("نقاط مضمونة من 10 إلى 100 — وكلما كبر المبلغ قلّ حظه، مع فرصة للفوز بثيمات وشارات نادرة.", "Guaranteed 10–100 points — bigger wins are rarer, plus a chance at rare themes and badges.")}
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

      <ProductTour steps={storeTourSteps()} run={tour.run} onDone={tour.onDone} />
    </div>
  );
};

export default Store;
