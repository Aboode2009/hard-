import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionUserId } from "@/lib/session-user";
import { progressQuery } from "@/lib/queries";
import { bi } from "@/i18n/bi";
import { ProgressFill } from "@/components/ui/progress-fill";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { ProductTour } from "@/components/ProductTour";
import { storyTourSteps, usePageTour } from "@/lib/page-tours";

const TOTAL_PIECES = 21;

// Every completed day adds one named piece to the house (Forest-style world,
// but you build a home instead of planting trees).
const STEPS: { ar: string; en: string }[] = [
  { ar: "الأساس الحجري", en: "Stone foundation" },
  { ar: "الأرضية الخشبية", en: "Wooden floor" },
  { ar: "الهيكل الخشبي", en: "Timber frame" },
  { ar: "الجدار الأيسر", en: "Left wall" },
  { ar: "الجدار الأيمن", en: "Right wall" },
  { ar: "الجدار الأمامي", en: "Front wall" },
  { ar: "الباب", en: "The door" },
  { ar: "النافذة اليسرى", en: "Left window" },
  { ar: "النافذة اليمنى", en: "Right window" },
  { ar: "عوارض السقف", en: "Roof beams" },
  { ar: "نصف القرميد", en: "Half the roof tiles" },
  { ar: "اكتمال القرميد", en: "Full roof tiles" },
  { ar: "المدخنة", en: "The chimney" },
  { ar: "دخان المدخنة", en: "Chimney smoke" },
  { ar: "الطلاء والتشطيب", en: "Paint & trim" },
  { ar: "الممر الحجري", en: "Stone path" },
  { ar: "السياج الخشبي", en: "Wooden fence" },
  { ar: "صندوق الزهور", en: "Flower box" },
  { ar: "الشجرة", en: "The tree" },
  { ar: "مصباح المدخل", en: "Entrance lamp" },
  { ar: "لافتة بيتي", en: "Home sign" },
];

const getStageDays = (stage: number) => (stage === 2 ? 45 : stage === 3 ? 75 : 21);

const StoryMode = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const uid = useSessionUserId();
  // Cached: the same progress row the other screens read, so a revisit (or a
  // visit after the home screen prefetched it) paints the house at once.
  const progressQ = useQuery(progressQuery(uid));
  const progress = progressQ.data;
  const loading = !!uid && progressQ.isPending;

  const completedCount = (Array.isArray(progress?.completed_days) ? progress!.completed_days : [])
    .map((d) => Number(d))
    .filter((n) => !isNaN(n)).length;
  const totalDays = getStageDays(progress?.stage_level || 1);
  // Map completed days onto the 21 build pieces (slower rhythm on 45/75-day paths)
  const pieces = completedCount <= 0
    ? 0
    : Math.max(1, Math.min(TOTAL_PIECES, Math.floor((completedCount * TOTAL_PIECES) / totalDays)));

  const [newPiece, setNewPiece] = useState<number | null>(null);
  const [isNight] = useState(() => document.documentElement.classList.contains("dark"));
  // First visit only. Waits out the "new piece" drop so the tour does not
  // talk over the celebration.
  const tour = usePageTour("story", !loading, newPiece !== null ? 2200 : 450);

  useEffect(() => {
    if (!uid) navigate("/auth");
  }, [uid, navigate]);

  // Trigger the "new piece" event when progress grew since the last visit.
  // Evaluated once, on fresh data — not on a cached copy being refreshed.
  const checkedNewPiece = useRef(false);
  useEffect(() => {
    if (checkedNewPiece.current || !uid || !progressQ.isSuccess || progressQ.isFetching) return;
    checkedNewPiece.current = true;
    try {
      const seenKey = `story_seen_${uid}`;
      const prevSeen = parseInt(localStorage.getItem(seenKey) || "0", 10);
      if (pieces > prevSeen) setNewPiece(pieces - 1);
      localStorage.setItem(seenKey, String(pieces));
    } catch {
      /* storage unavailable — skip the celebration */
    }
  }, [uid, progressQ.isSuccess, progressQ.isFetching, pieces]);

  // Celebrate the newly landed piece, then dismiss the banner
  useEffect(() => {
    if (newPiece === null) return;
    const boom = setTimeout(() => {
      haptic("medium");
      confetti({
        particleCount: pieces >= TOTAL_PIECES ? 220 : 60,
        spread: pieces >= TOTAL_PIECES ? 120 : 70,
        origin: { y: 0.6 },
        colors: ["#FFC800", "#58CC02", "#1CB0F6", "#FF4D8A"],
      });
    }, 900);
    const hide = setTimeout(() => setNewPiece(null), 6000);
    return () => { clearTimeout(boom); clearTimeout(hide); };
  }, [newPiece, pieces]);

  const built = (i: number) => i < pieces;
  const glass = (i: number) => (isNight && built(i) ? "#FFDE7A" : "#BDE7F8");

  // A build piece: drops from the sky if it's the newly earned one
  const Piece = ({ i, children }: { i: number; children: React.ReactNode }) => {
    if (!built(i)) return null;
    const isNew = i === newPiece;
    return (
      <motion.g
        initial={isNew ? { y: -340, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={isNew ? { type: "spring", stiffness: 160, damping: 14, delay: 0.4 } : undefined}
      >
        {children}
      </motion.g>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const nextName = pieces < TOTAL_PIECES ? (isArabic ? STEPS[pieces].ar : STEPS[pieces].en) : null;

  return (
    <div className="duo-page fixed inset-0 overflow-hidden select-none" dir={bi("rtl", "ltr")}>
      {/* ===== Sky (follows app theme: day / night) ===== */}
      <div
        className="absolute inset-0"
        style={{
          background: isNight
            ? "linear-gradient(180deg, #0B1026 0%, #14203E 55%, #1B2A4A 100%)"
            : "linear-gradient(180deg, #7EC8F2 0%, #A5DCF7 55%, #D9F1FC 100%)",
        }}
      />

      {/* Sun / Moon */}
      {isNight ? (
        <div className="absolute top-[9%] right-[12%] w-16 h-16">
          <div className="absolute inset-0 rounded-full" style={{ background: "#F4F1DE", boxShadow: "0 0 40px 10px rgba(244,241,222,0.25)" }} />
          <div className="absolute top-0 right-3 w-12 h-12 rounded-full" style={{ background: "#0F1830" }} />
        </div>
      ) : (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[8%] right-[10%] w-20 h-20 rounded-full"
          style={{ background: "#FFC800", boxShadow: "0 0 60px 20px rgba(255,200,0,0.35)" }}
        />
      )}

      {/* Stars (night) */}
      {isNight &&
        [...Array(26)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{ top: `${(i * 37) % 40}%`, left: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: (i % 5) * 0.4 }}
          />
        ))}

      {/* Drifting clouds (day) */}
      {!isNight &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={`cloud-${i}`}
            className="absolute rounded-full"
            style={{
              top: `${10 + i * 9}%`,
              width: 110 - i * 20,
              height: 34 - i * 6,
              background: "rgba(255,255,255,0.85)",
              filter: "blur(1px)",
            }}
            initial={{ x: -150 - i * 120 }}
            animate={{ x: "110vw" }}
            transition={{ duration: 60 + i * 25, repeat: Infinity, ease: "linear", delay: i * 8 }}
          />
        ))}

      {/* Fireflies (night) */}
      {isNight &&
        [...Array(7)].map((_, i) => (
          <motion.div
            key={`fly-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ bottom: `${18 + (i * 13) % 22}%`, left: `${(i * 29 + 8) % 92}%`, background: "#FFDE7A" }}
            animate={{ opacity: [0, 1, 0], y: [0, -14, 0], x: [0, i % 2 ? 10 : -10, 0] }}
            transition={{ duration: 3.4 + (i % 3), repeat: Infinity, delay: i * 0.7 }}
          />
        ))}

      {/* ===== Ground ===== */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[26%]"
        style={{
          background: isNight
            ? "linear-gradient(180deg, #2C4A34 0%, #22392A 60%, #1B2E22 100%)"
            : "linear-gradient(180deg, #83CB6F 0%, #6FBF63 60%, #5CAB52 100%)",
          borderRadius: "50% 50% 0 0 / 60px 60px 0 0",
        }}
      />

      {/* ===== The house ===== */}
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[min(92vw,420px)]" dir="ltr" data-tour="story-house">
        <svg viewBox="0 0 360 300" className="w-full overflow-visible">
          {/* 0 — Stone foundation */}
          <Piece i={0}>
            <rect x="88" y="260" width="184" height="20" rx="4" fill="#98A2AB" />
            <rect x="88" y="274" width="184" height="6" rx="3" fill="#7E8890" />
            <rect x="100" y="264" width="30" height="10" rx="3" fill="#8A949D" />
            <rect x="165" y="264" width="30" height="10" rx="3" fill="#8A949D" />
            <rect x="230" y="264" width="30" height="10" rx="3" fill="#8A949D" />
          </Piece>

          {/* 1 — Wooden floor */}
          <Piece i={1}>
            <rect x="96" y="248" width="168" height="14" rx="3" fill="#B5803E" />
            <path d="M138 248v14M180 248v14M222 248v14" stroke="#99672E" strokeWidth="2" />
          </Piece>

          {/* 2 — Timber frame */}
          <Piece i={2}>
            <rect x="98" y="148" width="12" height="102" rx="3" fill="#8A5A2B" />
            <rect x="250" y="148" width="12" height="102" rx="3" fill="#8A5A2B" />
            <rect x="98" y="142" width="164" height="10" rx="4" fill="#8A5A2B" />
          </Piece>

          {/* 3 — Left wall */}
          <Piece i={3}>
            <rect x="104" y="152" width="56" height="96" fill="#F4E3C2" />
          </Piece>

          {/* 4 — Right wall */}
          <Piece i={4}>
            <rect x="200" y="152" width="56" height="96" fill="#F4E3C2" />
          </Piece>

          {/* 5 — Front wall */}
          <Piece i={5}>
            <rect x="155" y="152" width="50" height="96" fill="#EFDCB8" />
          </Piece>

          {/* 6 — Door */}
          <Piece i={6}>
            <path d="M164 248v-38a16 16 0 0 1 32 0v38z" fill="#7C4D2E" />
            <path d="M164 248v-38a16 16 0 0 1 32 0v38" fill="none" stroke="#5F3A20" strokeWidth="3" />
            <circle cx="190" cy="226" r="2.6" fill="#FFC800" />
          </Piece>

          {/* 7 — Left window */}
          <Piece i={7}>
            {isNight && built(7) && <rect x="108" y="162" width="44" height="44" rx="10" fill="#FFDE7A" opacity="0.3" />}
            <rect x="114" y="168" width="32" height="32" rx="5" fill="#FFFFFF" />
            <rect x="118" y="172" width="24" height="24" rx="3" fill={glass(7)} />
            <path d="M130 172v24M118 184h24" stroke="#FFFFFF" strokeWidth="2.5" />
          </Piece>

          {/* 8 — Right window */}
          <Piece i={8}>
            {isNight && built(8) && <rect x="208" y="162" width="44" height="44" rx="10" fill="#FFDE7A" opacity="0.3" />}
            <rect x="214" y="168" width="32" height="32" rx="5" fill="#FFFFFF" />
            <rect x="218" y="172" width="24" height="24" rx="3" fill={glass(8)} />
            <path d="M230 172v24M218 184h24" stroke="#FFFFFF" strokeWidth="2.5" />
          </Piece>

          {/* 9 — Roof beams */}
          <Piece i={9}>
            <path d="M92 152L180 84M268 152L180 84M124 128h112" stroke="#8A5A2B" strokeWidth="7" strokeLinecap="round" fill="none" />
          </Piece>

          {/* 10 — Half roof tiles */}
          <Piece i={10}>
            <polygon points="88,152 180,82 180,152" fill="#E5484D" />
          </Piece>

          {/* 11 — Full roof tiles */}
          <Piece i={11}>
            <polygon points="180,82 272,152 180,152" fill="#D63C41" />
            <rect x="80" y="148" width="200" height="9" rx="4.5" fill="#C22F35" />
            <path d="M88 152L180 82L272 152" fill="none" stroke="#B02A30" strokeWidth="3" />
          </Piece>

          {/* 12 — Chimney */}
          <Piece i={12}>
            <rect x="216" y="96" width="18" height="36" rx="2" fill="#B04A3A" />
            <rect x="212" y="90" width="26" height="9" rx="3" fill="#8F3A2D" />
            <path d="M216 110h18M216 122h18" stroke="#8F3A2D" strokeWidth="2" />
          </Piece>

          {/* 13 — Chimney smoke (animated) */}
          {built(13) && (
            <g>
              {[0, 1, 2].map((s) => (
                <motion.circle
                  key={s}
                  cx={225}
                  fill={isNight ? "#C9D2E3" : "#FFFFFF"}
                  opacity={0.55}
                  animate={{ cy: [84, 58, 34], r: [4, 7, 10], opacity: [0.55, 0.35, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, delay: s * 1.05, ease: "easeOut" }}
                />
              ))}
            </g>
          )}

          {/* 14 — Paint & trim */}
          <Piece i={14}>
            <path d="M92 152L180 84L268 152" fill="none" stroke="#FFF6E4" strokeWidth="4" strokeLinecap="round" />
            <rect x="100" y="152" width="6" height="96" fill="#FFF6E4" />
            <rect x="254" y="152" width="6" height="96" fill="#FFF6E4" />
            <rect x="110" y="202" width="40" height="4" rx="2" fill="#FFF6E4" />
            <rect x="210" y="202" width="40" height="4" rx="2" fill="#FFF6E4" />
          </Piece>

          {/* 15 — Stone path */}
          <Piece i={15}>
            <ellipse cx="180" cy="286" rx="15" ry="5.5" fill="#AEB6BC" />
            <ellipse cx="174" cy="296" rx="17" ry="6" fill="#A0A8AF" />
            <ellipse cx="184" cy="306" rx="19" ry="6.5" fill="#AEB6BC" />
          </Piece>

          {/* 16 — Wooden fence */}
          <Piece i={16}>
            {[0, 1, 2, 3, 4].map((p) => (
              <rect key={p} x={16 + p * 15} y="242" width="9" height="34" rx="4" fill="#EDE6D6" />
            ))}
            <rect x="12" y="250" width="76" height="5" rx="2.5" fill="#DDD3BD" />
            <rect x="12" y="264" width="76" height="5" rx="2.5" fill="#DDD3BD" />
          </Piece>

          {/* 17 — Flower box */}
          <Piece i={17}>
            <path d="M222 198v-6M232 198v-8M242 198v-6" stroke="#58CC02" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="222" cy="190" r="4" fill="#FF4B4B" />
            <circle cx="232" cy="187" r="4" fill="#FFC800" />
            <circle cx="242" cy="190" r="4" fill="#CE82FF" />
            <rect x="210" y="198" width="44" height="11" rx="3" fill="#8A5A2B" />
          </Piece>

          {/* 18 — Tree (sways gently) */}
          <Piece i={18}>
            <rect x="312" y="216" width="12" height="50" rx="4" fill="#8A5A2B" />
            <motion.g
              style={{ originX: "318px", originY: "216px" }}
              animate={{ rotate: [-1.6, 1.6, -1.6] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <circle cx="300" cy="204" r="18" fill="#4CAF3E" />
              <circle cx="336" cy="204" r="18" fill="#4CAF3E" />
              <circle cx="318" cy="188" r="24" fill="#58CC02" />
              <circle cx="310" cy="182" r="9" fill="#78D630" opacity="0.8" />
            </motion.g>
          </Piece>

          {/* 19 — Entrance lamp (glows at night) */}
          <Piece i={19}>
            {isNight && <circle cx="146" cy="206" r="16" fill="#FFDE7A" opacity="0.35" />}
            <rect x="143" y="214" width="5" height="36" rx="2" fill="#4A5560" />
            <rect x="137" y="197" width="17" height="17" rx="4" fill="#4A5560" />
            <rect x="140" y="200" width="11" height="11" rx="2" fill={isNight ? "#FFDE7A" : "#DCEBF2"} />
          </Piece>

          {/* 20 — Home sign */}
          <Piece i={20}>
            <rect x="56" y="268" width="6" height="24" rx="3" fill="#8A5A2B" />
            <rect x="38" y="252" width="42" height="20" rx="5" fill="#B5803E" />
            <text
              x="59"
              y="266"
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="#5C3A1B"
            >
              {bi("بيتي", "HOME")}
            </text>
          </Piece>
        </svg>
      </div>

      {/* Empty plot hint */}
      {pieces === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-[32%] left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-sm font-extrabold text-center"
          style={{ background: "hsl(var(--duo-surface) / 0.9)", color: "hsl(var(--duo-text))", border: "2px solid hsl(var(--duo-border))" }}
        >
          {bi("أكمل يومك الأول ليبدأ بناء بيتك", "Complete your first day to start building")}
        </motion.div>
      )}

      {/* New piece banner */}
      <AnimatePresence>
        {newPiece !== null && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 300, damping: 24 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-center"
            style={{
              background: "hsl(var(--duo-surface))",
              border: "2px solid hsl(var(--duo-border))",
              boxShadow: "0 4px 0 hsl(var(--duo-edge))",
            }}
          >
            <p className="text-[11px] font-extrabold tracking-wider" style={{ color: "#FFC800" }}>
              {pieces >= TOTAL_PIECES
                ? (bi("اكتمل بيتك!", "YOUR HOME IS COMPLETE!"))
                : (bi("أُضيف اليوم", "ADDED TODAY"))}
            </p>
            <p className="text-base font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {isArabic ? STEPS[newPiece].ar : STEPS[newPiece].en}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Bottom info bar ===== */}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <div
          className="max-w-lg mx-auto rounded-2xl p-3 flex items-center gap-3"
          style={{
            background: "hsl(var(--duo-surface))",
            border: "2px solid hsl(var(--duo-border))",
            boxShadow: "0 4px 0 hsl(var(--duo-edge))",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="duo-press w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(var(--duo-border) / 0.5)" }}
          >
            {isArabic
              ? <ChevronRight className="w-5 h-5" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-5 h-5" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>

          <div className="flex-1 min-w-0" data-tour="story-progress">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                {bi("بيتي", "My Home")} — {pieces}/{TOTAL_PIECES}
              </span>
              <span className="text-xs font-bold truncate" style={{ color: "hsl(var(--duo-muted))" }} data-tour="story-next">
                {nextName
                  ? (isArabic ? `التالي: ${nextName}` : `Next: ${nextName}`)
                  : (bi("اكتمل بيتك!", "Home complete!"))}
              </span>
            </div>
            <div className="relative h-3.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--duo-border) / 0.6)" }}>
              <ProgressFill
                value={(pieces / TOTAL_PIECES) * 100}
                duration={0.9}
                className="rounded-full"
                style={{ background: "#FFC800" }}
              >
                <div className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-white/40" />
              </ProgressFill>
            </div>
          </div>
        </div>
      </div>

      <ProductTour steps={storyTourSteps()} run={tour.run} onDone={tour.onDone} />
    </div>
  );
};

export default StoryMode;
