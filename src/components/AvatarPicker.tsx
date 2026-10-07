import { useState } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { AVATARS, resolveAvatar, type AvatarGender } from "@/lib/avatars";
import { UserAvatar } from "@/components/UserAvatar";
import { haptic } from "@/lib/haptics";

interface AvatarPickerProps {
  avatarId: string | null;
  gender: string | null;
  /** Fixes the circle colour, same as everywhere else. */
  seed: string | null;
  /** Saves the pick; resolves once the server has it. */
  onPick: (avatarId: string) => Promise<void>;
}

/**
 * "Your character": the built-in avatars, four per gender. Opens on the tab of
 * the avatar the user has now; the other tab is one tap away (the pick is
 * theirs, it is not tied to the gender on file).
 */
export const AvatarPicker = ({ avatarId, gender, seed, onPick }: AvatarPickerProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const current = resolveAvatar(avatarId, gender);
  const [tab, setTab] = useState<AvatarGender>(current.gender);
  const [saving, setSaving] = useState<string | null>(null);

  const pick = async (id: string) => {
    if (id === current.id || saving) return;
    haptic("light");
    setSaving(id);
    try {
      await onPick(id);
    } finally {
      setSaving(null);
    }
  };

  const tabs: { id: AvatarGender; label: string }[] = [
    { id: "male", label: bi("ذكر", "Male") },
    { id: "female", label: bi("أنثى", "Female") },
  ];

  return (
    <div className="duo-card p-4 space-y-3.5">
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
          {bi("شخصيتك", "Your character")}
        </h2>
        <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
          {bi("اختار الشخصية اللي تمثّلك. تتغير بكل مكان بالتطبيق.", "Pick the character that's you. It changes everywhere in the app.")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl p-1" style={{ background: "hsl(var(--duo-border) / 0.5)" }} role="tablist">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className="h-11 rounded-xl text-base font-extrabold transition-colors"
              style={
                active
                  ? { background: "hsl(var(--duo-surface))", color: "#1899D6", boxShadow: "0 2px 0 hsl(var(--duo-edge))" }
                  : { background: "transparent", color: "hsl(var(--duo-muted))" }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-3 justify-items-center">
        {AVATARS.filter((a) => a.gender === tab).map((a) => {
          const selected = a.id === current.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => void pick(a.id)}
              disabled={saving !== null}
              aria-label={isArabic ? a.name.ar : a.name.en}
              aria-pressed={selected}
              className="duo-press relative rounded-full disabled:opacity-70"
              style={{
                boxShadow: selected ? "0 0 0 3px hsl(var(--duo-surface)), 0 0 0 6px #1CB0F6" : "none",
              }}
            >
              <UserAvatar avatarId={a.id} seed={seed} className="w-16 h-16" />
              {saving === a.id && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm font-extrabold" style={{ color: "#1899D6" }}>
        {isArabic ? current.name.ar : current.name.en}
      </p>
    </div>
  );
};
