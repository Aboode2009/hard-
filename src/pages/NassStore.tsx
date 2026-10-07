import { useState, useEffect, type CSSProperties } from "react";
import { bi } from "@/i18n/bi";
import { ProgressFill } from "@/components/ui/progress-fill";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { clearCompanyMode } from "@/lib/company-mode";
import { invalidateProgress } from "@/lib/query-client";
import { useQuery } from "@tanstack/react-query";
import { useSessionUserId } from "@/lib/session-user";
import { companyCodeQuery, progressQuery } from "@/lib/queries";
import { challengeRpc } from "@/lib/challenge-rpc";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import timeOffArt from "@/assets/nass/reward-time-off.svg";
import remoteDayArt from "@/assets/nass/reward-remote-day.svg";
import cashArt from "@/assets/nass/reward-cash.svg";

interface NassReward {
  /** The id redeem_nass_reward knows the reward by. */
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  pointsCost: number;
  /** Progress-bar colour, taken from the illustration. */
  color: string;
  art: string;
}

/** Cheapest first, like the store's power-ups. The server owns the prices. */
const nassRewards: NassReward[] = [
  {
    id: "two_hours_off",
    titleEn: "2 Hours Off",
    titleAr: "ساعتين إجازة",
    descriptionEn: "Two hours off work as a reward for showing up every day.",
    descriptionAr: "ساعتين راحة من الدوام كمكافأة على التزامك.",
    pointsCost: 5000,
    color: "#1CB0F6",
    art: timeOffArt,
  },
  {
    id: "remote_day",
    titleEn: "1 Day Work From Home",
    titleAr: "يوم عمل من البيت",
    descriptionEn: "Work from home for one full day.",
    descriptionAr: "اشتغل من بيتك يوم كامل.",
    pointsCost: 8000,
    color: "#FF4B4B",
    art: remoteDayArt,
  },
  {
    id: "cash_reward",
    titleEn: "25,000 IQD Cash",
    titleAr: "25,000 دينار عراقي",
    descriptionEn: "The grand prize — push yourself to reach it!",
    descriptionAr: "المكافأة الكبرى — تحدّى نفسك حتى توصلها!",
    pointsCost: 50000,
    color: "#58CC02",
    art: cashArt,
  },
];

const BLUE = "#1CB0F6";
const BLUE_EDGE = "#0F8ED9";
const GREEN = "#58CC02";
const GREEN_EDGE = "#46A302";

/** The duo surface every card and button in the stores uses. */
const SURFACE: CSSProperties = {
  background: "hsl(var(--duo-surface))",
  border: "2px solid hsl(var(--duo-border))",
  boxShadow: "0 3px 0 hsl(var(--duo-edge))",
};

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * The NASS rewards store, laid out like the main store: a flat illustration
 * per reward, how close the balance is, and the same "get it for" button.
 */
const NassStore = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";

  const userId = useSessionUserId();
  // Cached, and read side by side: the membership check no longer holds up
  // the balance, and neither waits on a round trip to the auth server.
  const codeQ = useQuery(companyCodeQuery(userId));
  const progressQ = useQuery(progressQuery(userId));
  const [userPoints, setUserPoints] = useState(() => progressQ.data?.total_points ?? 0);
  const loading = !!userId && progressQ.isPending;
  const [selected, setSelected] = useState<NassReward | null>(null);
  const [redeemed, setRedeemed] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (progressQ.data) setUserPoints(progressQ.data.total_points);
  }, [progressQ.data]);

  useEffect(() => {
    if (!userId) navigate("/auth");
  }, [userId, navigate]);

  // Only a definite non-NASS answer sends the user away (a failed read proves
  // nothing), and it forgets company mode on this device first.
  useEffect(() => {
    if (!userId || !codeQ.isSuccess || codeQ.data === "NASS") return;
    clearCompanyMode(userId);
    navigate("/store");
  }, [userId, codeQ.isSuccess, codeQ.data, navigate]);

  const open = (reward: NassReward) => {
    if (userPoints < reward.pointsCost) return;
    haptic("light");
    setRedeemed(false);
    setSelected(reward);
  };

  const close = () => {
    if (purchasing) return;
    setSelected(null);
    setRedeemed(false);
  };

  const handlePurchase = async () => {
    if (!selected || !userId) return;
    setPurchasing(true);
    try {
      // The reward's price and the balance are checked by the server, which
      // also records the purchase in the history.
      const { total_points } = await challengeRpc.redeemNassReward(selected.id);
      setUserPoints(total_points);
      invalidateProgress();
      setRedeemed(true);
      haptic("heavy");
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: bi("خطأ", "Error"),
        description: bi("حدث خطأ أثناء الاستبدال", "Something went wrong redeeming it"),
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const header = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => navigate("/nass")}
        aria-label={bi("رجوع", "Back")}
        className="duo-press w-11 h-11 flex items-center justify-center rounded-2xl"
        style={SURFACE}
      >
        {isArabic
          ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
          : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
      </button>
      <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
        {bi("متجر المكافآت", "Rewards Store")}
      </h1>
      <div className="flex items-center gap-1.5 px-2.5 h-11 rounded-2xl" style={SURFACE}>
        <DuoGem className="w-5 h-5" />
        <span className="font-extrabold text-sm tabular-nums" style={{ color: BLUE }} dir="ltr">
          {fmt(userPoints)}
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="duo-page min-h-screen bg-background"
      dir={bi("rtl", "ltr")}
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="max-w-lg mx-auto px-4 pt-5">
        {header}

        <span
          className="mt-4 inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full text-[13px] font-extrabold"
          style={{ background: "#1CB0F61f", color: "#1899D6" }}
        >
          <Building2 className="w-4 h-4" strokeWidth={2.6} />
          {bi("مكافآت حصرية لموظفي ناس", "Exclusive rewards for NASS employees")}
        </span>

        <section className="mt-6">
          <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("المكافآت", "Rewards")}
          </h2>
          <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

          {loading ? (
            <div className="space-y-7">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl animate-pulse flex-shrink-0" style={{ background: "hsl(var(--duo-border) / 0.6)" }} />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-5 w-2/3 rounded-lg animate-pulse" style={{ background: "hsl(var(--duo-border) / 0.6)" }} />
                    <div className="h-4 w-full rounded-lg animate-pulse" style={{ background: "hsl(var(--duo-border) / 0.4)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-7">
              {nassRewards.map((reward, index) => {
                const canAfford = userPoints >= reward.pointsCost;
                const progress = Math.min(100, (userPoints / reward.pointsCost) * 100);
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex items-start gap-4"
                  >
                    <img src={reward.art} alt="" className="w-20 h-20 flex-shrink-0 select-none" draggable={false} />

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-extrabold leading-tight" style={{ color: "hsl(var(--duo-text))" }}>
                        {isArabic ? reward.titleAr : reward.titleEn}
                      </h3>
                      <p className="text-sm font-medium mt-1 leading-relaxed" style={{ color: "hsl(var(--duo-muted))" }}>
                        {isArabic ? reward.descriptionAr : reward.descriptionEn}
                      </p>

                      <div className="mt-2.5 flex items-center gap-2.5">
                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--duo-border))" }}>
                          <ProgressFill value={progress} duration={0.5} className="rounded-full" style={{ background: reward.color }} />
                        </div>
                        <span className="text-xs font-extrabold tabular-nums whitespace-nowrap" style={{ color: "hsl(var(--duo-muted))" }} dir="ltr">
                          {fmt(Math.min(userPoints, reward.pointsCost))} / {fmt(reward.pointsCost)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => open(reward)}
                        disabled={!canAfford}
                        className="duo-press mt-3 inline-flex items-center gap-2 h-12 px-5 rounded-2xl font-extrabold text-sm tracking-wide disabled:cursor-not-allowed"
                        style={{ ...SURFACE, color: BLUE, opacity: canAfford ? 1 : 0.5 }}
                      >
                        {bi("احصل عليها مقابل:", "GET FOR:")}
                        <DuoGem className="w-6 h-6" />
                        <span dir="ltr">{fmt(reward.pointsCost)}</span>
                      </button>
                      {!canAfford && (
                        <p className="text-xs font-bold mt-2" style={{ color: "hsl(var(--duo-muted))" }}>
                          {isArabic
                            ? `تحتاج ${fmt(reward.pointsCost - userPoints)} نقطة زيادة`
                            : `You need ${fmt(reward.pointsCost - userPoints)} more points`}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Confirm, then the result ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(10,12,16,0.55)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            dir={bi("rtl", "ltr")}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={bi("تأكيد الاستبدال", "Confirm")}
              className="duo-page w-full max-w-sm rounded-[28px] p-5 flex flex-col items-center gap-3 text-center"
              style={{ ...SURFACE, boxShadow: "0 6px 0 hsl(var(--duo-edge))" }}
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                key={redeemed ? "done" : "ask"}
                src={selected.art}
                alt=""
                className="w-24 h-24"
                initial={redeemed ? { scale: 0.6, rotate: -8 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
              />

              {redeemed ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[22px] font-extrabold" style={{ color: GREEN_EDGE }}>
                      {bi("مبروك! حصلت عليها", "It's yours!")}
                    </p>
                    <p className="text-[15px] font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                      {isArabic ? selected.titleAr : selected.titleEn}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="duo-press w-full h-[52px] rounded-2xl text-[17px] font-extrabold text-white"
                    style={{ background: GREEN, boxShadow: `0 4px 0 ${GREEN_EDGE}` }}
                  >
                    {bi("تمام", "Done")}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "hsl(var(--duo-muted))" }}>{bi("تستبدل نقاطك بـ", "You're redeeming")}</p>
                    <p className="text-[22px] font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                      {isArabic ? selected.titleAr : selected.titleEn}
                    </p>
                  </div>
                  <div className="w-full rounded-2xl px-3.5 py-3 space-y-2 text-start" style={{ background: "hsl(var(--background))" }}>
                    <div className="flex justify-between text-[15px] font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                      <span>{bi("رصيدك", "Balance")}</span>
                      <span dir="ltr" style={{ color: "hsl(var(--duo-text))" }}>{fmt(userPoints)}</span>
                    </div>
                    <div className="flex justify-between text-[15px] font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                      <span>{bi("السعر", "Price")}</span>
                      <span dir="ltr" style={{ color: "#FF4B4B" }}>−{fmt(selected.pointsCost)}</span>
                    </div>
                    <div className="h-0.5" style={{ background: "hsl(var(--duo-border))" }} />
                    <div className="flex justify-between text-base font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                      <span>{bi("يبقى عندك", "Left after")}</span>
                      <span dir="ltr" style={{ color: BLUE }}>{fmt(userPoints - selected.pointsCost)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handlePurchase()}
                    disabled={purchasing}
                    className="duo-press w-full h-[52px] rounded-2xl flex items-center justify-center text-[17px] font-extrabold text-white disabled:opacity-80"
                    style={{ background: BLUE, boxShadow: `0 4px 0 ${BLUE_EDGE}` }}
                  >
                    {purchasing ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="block w-5 h-5 border-[3px] border-current border-t-transparent rounded-full"
                      />
                    ) : (
                      bi("تأكيد الاستبدال", "Confirm")
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    disabled={purchasing}
                    className="w-full h-11 rounded-[14px] text-base font-extrabold"
                    style={{ color: "hsl(var(--duo-muted))" }}
                  >
                    {bi("لا، رجوع", "No, go back")}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NassStore;
