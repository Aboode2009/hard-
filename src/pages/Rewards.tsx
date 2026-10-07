import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useTimers } from "@/hooks/useTimers";
import { ProgressFill } from "@/components/ui/progress-fill";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { shareableOrigin } from "@/config/auth";
import { ChevronLeft, ChevronRight, Share2, Copy, Check, Flame, Star, CheckCircle2, UsersRound } from "lucide-react";
import { DuoGem, DuoUsers } from "@/components/icons/DuolingoIcons";
import { StatsIcon, StoreIcon, TrophyIcon, ChestIcon } from "@/components/nav-icons";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const POINTS_PER_REFERRAL = 100;
const MAX_REFERRALS = 10;

const Rewards = () => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [totalPoints, setTotalPoints] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [copied, setCopied] = useState(false);
  /** Auto-cleared on unmount. */
  const after = useTimers();

  useEffect(() => {
    fetchRewardsData();
  }, []);

  const fetchRewardsData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: progress } = await supabase
      .from("challenge_progress")
      .select("total_points")
      .eq("user_id", user.id)
      .maybeSingle();

    if (progress) setTotalPoints(progress.total_points);

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, total_referrals")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      setReferralCode(profile.referral_code || "");
      setTotalReferrals(profile.total_referrals || 0);
    }
  };

  // The public web address, not the WebView's https://localhost.
  const referralLink = () => `${shareableOrigin()}/auth?ref=${referralCode}`;

  const copyReferralLink = async () => {
    const link = referralLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      haptic("light");
      toast({ title: bi("تم النسخ!", "Copied!"), description: bi("تم نسخ رابط الدعوة", "Referral link copied") });
      after(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: bi("خطأ", "Error"), description: bi("فشل في نسخ الرابط", "Failed to copy") });
    }
  };

  const shareReferral = async () => {
    const link = referralLink();
    const title = bi("دعوة للتحدي", "Challenge Invitation");
    const text = isArabic
      ? `انضم إلي في تحدي Hard 21! استخدم رابط الدعوة: ${link}`
      : `Join me on the Hard 21 challenge! Use my referral link: ${link}`;
    // Closing the share sheet rejects too; that is the user's choice, not a
    // failure, so it must not fall through to copying.
    const cancelled = (err: unknown) => /cancel|abort/i.test(String((err as Error)?.message ?? err));
    try {
      // Android's WebView has no navigator.share, so native goes through the
      // system share sheet plugin.
      if (Capacitor.isNativePlatform()) await Share.share({ title, text, dialogTitle: title });
      else if (navigator.share) await navigator.share({ title, text });
      else await copyReferralLink();
    } catch (err) {
      if (!cancelled(err)) await copyReferralLink();
    }
  };

  const referralProgress = Math.min(100, (totalReferrals / MAX_REFERRALS) * 100);

  const quickActions = [
    { Icon: StatsIcon, label: bi("سجل النقاط", "Points Log"), route: "/points" },
    { Icon: StoreIcon, label: bi("المتجر", "Store"), route: "/store" },
    { Icon: TrophyIcon, label: bi("المتصدرين", "Leaders"), route: "/leaderboard" },
    { Icon: ChestIcon, label: bi("الأوسمة", "Badges"), route: "/achievements" },
  ];

  const earnRows = [
    { icon: CheckCircle2, color: "#58CC02", text: bi("أكمل المهام اليومية", "Complete daily tasks"), pts: "+10" },
    { icon: Flame, color: "#FF9600", text: bi("حافظ على الستريك", "Keep your streak"), pts: "+5" },
    { icon: UsersRound, color: "#1CB0F6", text: bi("ادعُ صديقًا", "Invite a friend"), pts: "+100" },
    { icon: Star, color: "#FFC800", text: bi("أكمل مرحلة كاملة", "Complete a full stage"), pts: "+50" },
  ];

  return (
    <div className="duo-page min-h-screen bg-background pb-10" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("المكافآت", "Rewards")}
          </h1>
          <div className="w-11" />
        </div>

        {/* Points hero card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="duo-card p-5 mb-6 flex items-center gap-4"
        >
          <DuoGem className="w-16 h-16 flex-shrink-0" />
          <div>
            <p className="text-4xl font-extrabold leading-none" style={{ color: "#1CB0F6" }}>
              {totalPoints.toLocaleString()}
            </p>
            <p className="text-sm font-bold mt-1.5" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("رصيدك من النقاط", "Your points balance")}
            </p>
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2.5 mb-8">
          {quickActions.map(({ Icon, label, route }, index) => (
            <motion.button
              key={route}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.05 }}
              onClick={() => navigate(route)}
              className="duo-card duo-press flex flex-col items-center gap-1.5 py-3"
            >
              <Icon className="w-9 h-9" />
              <span className="text-[11px] font-bold leading-tight text-center" style={{ color: "hsl(var(--duo-text))" }}>
                {label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Invite quest — Duolingo daily-quest style */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("مهمة الدعوات", "Friend Quest")}
          </h2>
          <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

          <div className="duo-card p-4">
            <div className="flex items-start gap-3.5">
              <DuoUsers className="w-14 h-14 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                  {isArabic ? `ادعُ ${MAX_REFERRALS} أصدقاء للتحدي` : `Invite ${MAX_REFERRALS} friends to the challenge`}
                </h3>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                  {isArabic ? `+${POINTS_PER_REFERRAL} نقطة لكل صديق ينضم` : `+${POINTS_PER_REFERRAL} points per friend who joins`}
                </p>

                {/* Quest progress bar with chest at the end */}
                <div className="flex items-center gap-2 mt-3">
                  <div
                    className="relative flex-1 h-6 rounded-full overflow-hidden"
                    style={{ background: "hsl(var(--duo-border) / 0.6)" }}
                  >
                    <ProgressFill
                      value={referralProgress}
                      duration={1}
                      className="rounded-full"
                      style={{ background: "#FFC800" }}
                    >
                      <div className="absolute inset-x-3 top-1 h-1.5 rounded-full bg-white/40" />
                    </ProgressFill>
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xs font-extrabold"
                      style={{ color: "hsl(var(--duo-text))" }}
                    >
                      <span dir="ltr">{totalReferrals} / {MAX_REFERRALS}</span>
                    </span>
                  </div>
                  <ChestIcon className="w-9 h-9 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Referral code + share */}
            {referralCode && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-xl px-4 py-3 font-mono font-extrabold text-center tracking-[0.25em] text-sm"
                    style={{
                      background: "hsl(var(--duo-border) / 0.4)",
                      color: "hsl(var(--duo-text))",
                      border: "2px solid hsl(var(--duo-border))",
                    }}
                  >
                    {referralCode}
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className="duo-card duo-press w-12 h-12 flex items-center justify-center flex-shrink-0"
                    style={{ borderRadius: "0.75rem" }}
                  >
                    {copied
                      ? <Check className="w-5 h-5" style={{ color: "#58CC02" }} strokeWidth={3} />
                      : <Copy className="w-5 h-5" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />}
                  </button>
                </div>

                <button
                  onClick={shareReferral}
                  className="duo-press w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-white tracking-wide"
                  style={{ background: "#58CC02", boxShadow: "0 4px 0 #45a302" }}
                >
                  <Share2 className="w-5 h-5" strokeWidth={2.5} />
                  {bi("شارك رابط الدعوة", "SHARE INVITE LINK")}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Earn more — quest-style rows */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("اكسب المزيد", "Earn More")}
          </h2>
          <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

          <div className="space-y-3">
            {earnRows.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isArabic ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.07 }}
                  className="duo-card flex items-center gap-3 px-4 py-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}22` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} strokeWidth={2.5} />
                  </div>
                  <span className="flex-1 text-sm font-bold" style={{ color: "hsl(var(--duo-text))" }}>
                    {item.text}
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <DuoGem className="w-[18px] h-[18px]" />
                    <span className="text-sm font-extrabold" style={{ color: "#1CB0F6" }}>{item.pts}</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Rewards;
