import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Gift, Clock, Laptop, Banknote, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NassReward {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  pointsCost: number;
  icon: React.ReactNode;
  color: string;
  emoji: string;
}

const nassRewards: NassReward[] = [
  {
    id: "cash_reward",
    titleEn: "25,000 IQD Cash",
    titleAr: "25,000 دينار عراقي",
    descriptionEn: "Challenge yourself to reach this ultimate reward!",
    descriptionAr: "تحدى نفسك للوصول لهذه المكافأة النهائية!",
    pointsCost: 50000, // Very high points - challenging
    icon: <Banknote className="w-8 h-8" />,
    color: "#FFC800",
    emoji: "💰",
  },
  {
    id: "two_hours_off",
    titleEn: "2 Hours Vacation",
    titleAr: "ساعتين إجازة",
    descriptionEn: "Earn 2 hours off from work as a reward",
    descriptionAr: "احصل على ساعتين إجازة من العمل كمكافأة",
    pointsCost: 5000,
    icon: <Clock className="w-8 h-8" />,
    color: "#1CB0F6",
    emoji: "⏰",
  },
  {
    id: "remote_day",
    titleEn: "1 Day Work From Home",
    titleAr: "يوم عمل من المنزل",
    descriptionEn: "Work remotely for one full day",
    descriptionAr: "اعمل عن بعد ليوم كامل",
    pointsCost: 8000,
    icon: <Laptop className="w-8 h-8" />,
    color: "#CE82FF",
    emoji: "🏠",
  },
];

const NassStore = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";

  const [userId, setUserId] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<NassReward | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { user } } = await clerkAuth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is NASS employee
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_code")
        .eq("id", user.id)
        .single();

      if (profile?.company_code !== "NASS") {
        navigate("/store");
        return;
      }

      setUserId(user.id);

      // Fetch user's total points
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("total_points")
        .eq("user_id", user.id)
        .single();

      if (progress) {
        setUserPoints(progress.total_points);
      }

      setLoading(false);
    };

    checkUserAndFetchData();
  }, [navigate]);

  const handleRewardClick = (reward: NassReward) => {
    setSelectedReward(reward);
    setConfirmDialogOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedReward || !userId) return;

    if (userPoints < selectedReward.pointsCost) {
      toast({
        title: bi("نقاط غير كافية", "Insufficient Points"),
        description: isArabic 
          ? `تحتاج ${selectedReward.pointsCost - userPoints} نقطة إضافية`
          : `You need ${selectedReward.pointsCost - userPoints} more points`,
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
      return;
    }

    setPurchasing(true);

    try {
      // Deduct points from user
      const { error } = await supabase
        .from("challenge_progress")
        .update({ 
          total_points: userPoints - selectedReward.pointsCost 
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Record the purchase in task_completions for history
      await supabase
        .from("task_completions")
        .insert({
          user_id: userId,
          task_key: `nass_reward_${selectedReward.id}`,
          points_earned: -selectedReward.pointsCost,
        });

      setUserPoints(prev => prev - selectedReward.pointsCost);

      toast({
        title: bi("🎉 تم الشراء بنجاح!", "🎉 Purchase Successful!"),
        description: isArabic 
          ? `لقد حصلت على: ${selectedReward.titleAr}`
          : `You've earned: ${selectedReward.titleEn}`,
      });

      setConfirmDialogOpen(false);
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: bi("خطأ", "Error"),
        description: bi("حدث خطأ أثناء الشراء", "An error occurred during purchase"),
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={bi("rtl", "ltr")}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b-2" style={{ borderColor: "hsl(var(--duo-border))" }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate("/nass")}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>

          <h1 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("متجر المكافآت", "Rewards Store")}
          </h1>

          <div className="duo-card flex items-center gap-1.5 px-3 h-11" style={{ borderRadius: "1rem" }}>
            <DuoGem className="w-5 h-5" />
            <span className="font-extrabold" style={{ color: "#1CB0F6" }}>{userPoints.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* NASS Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 p-4 rounded-2xl text-white"
        style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.3)" }}>
            <Gift className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-extrabold text-lg leading-tight">
              {bi("مكافآت شركة NASS", "NASS Company Rewards")}
            </h2>
            <p className="text-sm font-semibold text-white/80">
              {bi("مكافآت حصرية لموظفي ناس", "Exclusive rewards for NASS employees")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Rewards Grid */}
      <div className="p-4 space-y-4">
        {nassRewards.map((reward, index) => {
          const canAfford = userPoints >= reward.pointsCost;
          const progress = Math.min(100, (userPoints / reward.pointsCost) * 100);

          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className="duo-card duo-press overflow-hidden cursor-pointer"
                style={canAfford ? { borderColor: "#58CC02" } : undefined}
                onClick={() => handleRewardClick(reward)}
              >
                <div
                  className="p-4 text-white"
                  style={{
                    background: reward.color,
                    borderBottom: `4px solid color-mix(in srgb, ${reward.color} 70%, black)`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.2)" }}
                      >
                        {reward.emoji}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg leading-tight">
                          {isArabic ? reward.titleAr : reward.titleEn}
                        </h3>
                        <p className="text-sm font-semibold text-white/80">
                          {isArabic ? reward.descriptionAr : reward.descriptionEn}
                        </p>
                      </div>
                    </div>
                    {canAfford && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "#58CC02", boxShadow: "0 2px 0 #45A302" }}
                      >
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                      {bi("التقدم", "Progress")}
                    </span>
                    <span className="font-extrabold" style={{ color: reward.color }}>
                      {userPoints.toLocaleString()} / {reward.pointsCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--duo-border))" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: reward.color }}
                    />
                  </div>

                  {!canAfford && (
                    <p className="text-xs font-semibold mt-2" style={{ color: "hsl(var(--duo-muted))" }}>
                      {isArabic
                        ? `تحتاج ${(reward.pointsCost - userPoints).toLocaleString()} نقطة إضافية`
                        : `You need ${(reward.pointsCost - userPoints).toLocaleString()} more points`
                      }
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Confirm Purchase Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bi("تأكيد الشراء", "Confirm Purchase")}
            </DialogTitle>
            <DialogDescription>
              {selectedReward && (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">{selectedReward.emoji}</div>
                  <h3 className="font-extrabold text-lg" style={{ color: "hsl(var(--duo-text))" }}>
                    {isArabic ? selectedReward.titleAr : selectedReward.titleEn}
                  </h3>
                  <p className="font-semibold mt-2" style={{ color: "hsl(var(--duo-muted))" }}>
                    {isArabic
                      ? `سيتم خصم ${selectedReward.pointsCost.toLocaleString()} نقطة من رصيدك`
                      : `${selectedReward.pointsCost.toLocaleString()} points will be deducted from your balance`
                    }
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={purchasing}
            >
              {bi("إلغاء", "Cancel")}
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={purchasing || (selectedReward && userPoints < selectedReward.pointsCost)}
              className="duo-press rounded-2xl font-extrabold text-white border-0"
              style={{
                background: selectedReward?.color || "#58CC02",
                boxShadow: `0 4px 0 color-mix(in srgb, ${selectedReward?.color || "#58CC02"} 70%, black)`,
              }}
            >
              {purchasing
                ? (bi("جاري الشراء...", "Purchasing..."))
                : (bi("شراء الآن", "Purchase Now"))
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NassStore;
