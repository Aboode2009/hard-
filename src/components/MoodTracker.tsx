import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";

export const MOODS = [
  { key: "excellent", emoji: "😄", color: "bg-amber-400" },
  { key: "great", emoji: "😊", color: "bg-yellow-300" },
  { key: "good", emoji: "🙂", color: "bg-emerald-400" },
  { key: "neutral", emoji: "😐", color: "bg-sky-300" },
  { key: "poor", emoji: "🙁", color: "bg-blue-400" },
  { key: "bad", emoji: "😢", color: "bg-purple-400" },
  { key: "awful", emoji: "😭", color: "bg-rose-400" },
];

type Step = "select" | "reason";

export const MoodTracker = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [pendingMood, setPendingMood] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysMood();
  }, []);

  const fetchTodaysMood = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from("mood_entries")
        .select("mood")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .maybeSingle();

      if (data) {
        setSelectedMood(data.mood);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSelect = (moodKey: string) => {
    setPendingMood(moodKey);
    setStep("reason");
  };

  const handleSave = async () => {
    const { data: { user } } = await clerkAuth.getUser();
    if (!user || !pendingMood) return;

    setSaving(true);
    const today = new Date().toISOString().split('T')[0];

    // Check if there's already an entry for today
    const { data: existing } = await supabase
      .from("mood_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("entry_date", today)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing entry
      const result = await supabase
        .from("mood_entries")
        .update({ mood: pendingMood, reason: reason || null })
        .eq("id", existing.id);
      error = result.error;
    } else {
      // Insert new entry
      const result = await supabase
        .from("mood_entries")
        .insert({
          user_id: user.id,
          mood: pendingMood,
          reason: reason || null,
          entry_date: today,
        });
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast({
        title: t("mood.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSelectedMood(pendingMood);
    setIsOpen(false);
    setStep("select");
    setReason("");
    toast({
      title: t("mood.saved", "Mood saved!"),
      description: t("mood.savedDescription", "Your mood has been recorded."),
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("select");
    setPendingMood(null);
    setReason("");
  };

  const pendingMoodData = MOODS.find(m => m.key === pendingMood);

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 z-50"
            onClick={(e) => e.target === e.currentTarget && step === "select" && handleClose()}
          >
            {step === "select" ? (
              /* Mood Selection Panel — arranged as an even circular wheel */
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Wheel container (square, keeps the circle round on any screen) */}
                <div
                  className="relative"
                  style={{ width: "min(84vw, 62vh)", height: "min(84vw, 62vh)" }}
                >
                  {/* Center Question */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                    <motion.h2
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-xl font-extrabold text-center max-w-[46%] leading-snug"
                      style={{ color: "hsl(var(--duo-text))" }}
                    >
                      {t("mood.question", "How you feel now?")}
                    </motion.h2>
                  </div>

                  {/* Mood Options evenly distributed around the wheel */}
                  {MOODS.map((mood, index) => {
                    const angle = (index / MOODS.length) * 2 * Math.PI - Math.PI / 2;
                    const x = 50 + 43 * Math.cos(angle);
                    const y = 50 + 43 * Math.sin(angle);
                    return (
                      <div
                        key={mood.key}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        <motion.button
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.12 + index * 0.05, type: "spring", stiffness: 260, damping: 20 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoodSelect(mood.key);
                          }}
                          className="flex flex-col items-center gap-1.5 group"
                        >
                          <div className={`w-16 h-16 ${mood.color} rounded-full flex items-center justify-center text-[34px] shadow-[0_3px_0_hsl(var(--duo-edge))] transition-transform group-hover:scale-110 group-active:scale-95 emoji-ios`}>
                            {mood.emoji}
                          </div>
                          <span className="text-sm font-bold whitespace-nowrap" style={{ color: "hsl(var(--duo-text))" }}>
                            {t(`mood.${mood.key}`, mood.key.charAt(0).toUpperCase() + mood.key.slice(1))}
                          </span>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>

                {/* Close Button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={handleClose}
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 w-12 h-12 duo-press rounded-full flex items-center justify-center"
                  style={{
                    background: "hsl(var(--duo-surface))",
                    border: "2px solid hsl(var(--duo-border))",
                    boxShadow: "0 3px 0 hsl(var(--duo-edge))",
                    color: "hsl(var(--duo-muted))",
                  }}
                >
                  <X className="w-6 h-6" strokeWidth={2.5} />
                </motion.button>
              </div>
            ) : (
              /* Reason Input Panel */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-full flex flex-col items-center justify-center p-6"
              >
                {/* Mood Display at Top */}
                {pendingMoodData && (
                  <div className="flex flex-col items-center mb-8">
                    <div className={`w-24 h-24 ${pendingMoodData.color} rounded-full flex items-center justify-center text-5xl shadow-[0_3px_0_hsl(var(--duo-edge))] mb-3 emoji-ios`}>
                      {pendingMoodData.emoji}
                    </div>
                    <h2 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                      {t(`mood.${pendingMoodData.key}`, pendingMoodData.key.charAt(0).toUpperCase() + pendingMoodData.key.slice(1))}
                    </h2>
                  </div>
                )}

                {/* Reason Input in Middle */}
                <div className="w-full max-w-sm space-y-4">
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("mood.addReason", "Add reason")}
                    className="w-full h-12 rounded-full border-2 px-5 text-base text-center"
                    style={{
                      background: "hsl(var(--duo-surface))",
                      borderColor: "hsl(var(--duo-border))",
                      color: "hsl(var(--duo-text))",
                    }}
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1 h-12 rounded-full duo-press font-bold"
                      style={{
                        background: "hsl(var(--duo-surface))",
                        border: "2px solid hsl(var(--duo-border))",
                        boxShadow: "0 3px 0 hsl(var(--duo-edge))",
                        color: "hsl(var(--duo-text))",
                      }}
                    >
                      {t("common.cancel", "Cancel")}
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 h-12 rounded-full duo-press text-white font-bold"
                      style={{ background: "#58CC02", boxShadow: "0 3px 0 #45A302" }}
                    >
                      {saving ? "..." : t("mood.save", "Save")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button — hidden once today's mood is recorded; reappears the next day */}
      {!loading && !selectedMood && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "#FFC800",
            boxShadow: "0 3px 0 hsl(var(--duo-edge))",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-full h-full rounded-full bg-amber-400 flex items-center justify-center relative">
            <span className="text-2xl emoji-ios leading-none">🙂</span>
            {/* Plus Badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FF4B4B] rounded-full flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.button>
      )}
    </>
  );
};
