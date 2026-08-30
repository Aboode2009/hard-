import { useEffect, useState, useRef } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { Flame, Calendar, Trophy, Settings, LogOut, ChevronLeft, ChevronRight, Pencil, Check, X, Camera, User, Sprout, Gem, Medal, Zap, CircleCheck, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface ProfileData {
  username: string;
  created_at: string;
  avatar_url: string | null;
}

interface ProgressData {
  current_day: number;
  current_streak: number;
  best_streak: number;
  completed_days: number[];
  start_date: string;
  is_active: boolean;
  stage_level: number;
}

const Profile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check admin status
      const { data: adminData } = await supabase.rpc('is_admin');
      if (adminData) {
        setIsAdmin(true);
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username, created_at, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        // Profile doesn't exist yet, create it
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({ id: user.id, username: user.email?.split('@')[0] || 'user' })
          .select("username, created_at, avatar_url")
          .single();
        
        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(profileData);
      }

      // Fetch progress
      const { data: progressData, error: progressError } = await supabase
        .from("challenge_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (progressError) throw progressError;
      
      if (!progressData) {
        // Create challenge progress if missing
        const { data: newProgress, error: cpError } = await supabase
          .from("challenge_progress")
          .insert({ user_id: user.id, start_date: new Date().toISOString().split('T')[0] })
          .select("*")
          .single();
        
        if (cpError) throw cpError;
        setProgress(newProgress ? {
          current_day: newProgress.current_day,
          current_streak: newProgress.current_streak,
          best_streak: newProgress.best_streak,
          completed_days: Array.isArray(newProgress.completed_days) ? newProgress.completed_days as number[] : [],
          start_date: newProgress.start_date,
          is_active: newProgress.is_active,
          stage_level: newProgress.stage_level || 1,
        } : null);
        setLoading(false);
        return;
      }
      
      const formattedProgress: ProgressData = {
        ...progressData,
        completed_days: (progressData.completed_days || []) as number[],
      };
      
      setProgress(formattedProgress);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t('profile.loadError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t('profile.noData')}</div>
      </div>
    );
  }

  const getStageDays = (stage: number) => {
    if (stage === 1) return 21;
    if (stage === 2) return 45;
    if (stage === 3) return 75;
    return 21;
  };

  const getStageName = (stage: number) => {
    if (stage === 1) return t('challenge.stageName');
    if (stage === 2) return t('challenge.stage2Name');
    if (stage === 3) return t('challenge.stage3Name');
    return t('challenge.stageName');
  };

  const getStageStatus = (stage: number) => {
    if (stage < progress.stage_level) return 'completed';
    if (stage === progress.stage_level) return 'current';
    return 'upcoming';
  };

  const getCurrentStageDaysCompleted = () => {
    return progress.completed_days.length;
  };

  const getCurrentStageTotalDays = () => {
    return getStageDays(progress.stage_level);
  };

  const getStageProgress = () => {
    return (getCurrentStageDaysCompleted() / getCurrentStageTotalDays()) * 100;
  };

  const completionPercentage = (progress.completed_days.length / getStageDays(progress.stage_level)) * 100;
  // Use the higher value between completed_days array length and current_streak
  // since a streak of N means N days were completed consecutively
  const daysCompleted = Math.max(progress.completed_days.length, progress.current_streak);
  const startDate = new Date(progress.start_date).toLocaleDateString('ar-EG');

  const handleLogout = async () => {
    await clerkAuth.signOut();
    navigate("/auth");
  };

  const handleEditUsername = () => {
    setNewUsername(profile?.username || "");
    setIsEditingName(true);
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername.trim().length < 2) {
      toast({
        title: bi("الاسم قصير جداً", "Username too short"),
        description: bi("يجب أن يكون الاسم حرفين على الأقل", "Username must be at least 2 characters"),
        variant: "destructive",
      });
      return;
    }

    if (newUsername.trim().length > 30) {
      toast({
        title: bi("الاسم طويل جداً", "Username too long"),
        description: bi("يجب أن يكون الاسم أقل من 30 حرف", "Username must be less than 30 characters"),
        variant: "destructive",
      });
      return;
    }

    setSavingName(true);
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ username: newUsername.trim() })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
      setIsEditingName(false);
      toast({
        title: bi("تم التحديث", "Updated"),
        description: bi("تم تغيير اسم المستخدم بنجاح", "Username updated successfully"),
      });
    } catch (error) {
      console.error("Error updating username:", error);
      toast({
        title: bi("خطأ", "Error"),
        description: bi("فشل تحديث اسم المستخدم", "Failed to update username"),
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setNewUsername("");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: bi("نوع ملف غير صالح", "Invalid file type"),
        description: bi("يرجى اختيار صورة", "Please select an image file"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: bi("الصورة كبيرة جداً", "Image too large"),
        description: bi("الحد الأقصى 5 ميجابايت", "Maximum size is 5MB"),
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to bust cache
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast({
        title: bi("تم التحديث", "Updated"),
        description: bi("تم تغيير الصورة الشخصية بنجاح", "Profile picture updated successfully"),
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: bi("خطأ", "Error"),
        description: bi("فشل تحميل الصورة", "Failed to upload image"),
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isArabic = i18n.language === 'ar';

  // Duolingo-style accent palette (vivid, works in light & dark).
  const DUO = {
    blue: "#1CB0F6",
    orange: "#FF9600",
    green: "#58CC02",
    gold: "#FFC800",
    purple: "#CE82FF",
    red: "#FF4B4B",
  };

  const stageIcons = [Sprout, Flame, Gem];
  const stageColors = [DUO.green, DUO.orange, DUO.blue];

  // SVG ring for circular progress
  const ringSize = 100;
  const strokeW = 7;
  const radius = (ringSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressPct = (getCurrentStageDaysCompleted() / getCurrentStageTotalDays()) * 100;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const statCards = [
    { icon: Calendar, color: DUO.blue, value: progress.current_day, label: bi("اليوم", "Day") },
    { icon: Flame, color: DUO.orange, value: progress.current_streak, label: bi("ستريك", "Streak") },
    { icon: CircleCheck, color: DUO.green, value: daysCompleted, label: bi("مكتمل", "Done") },
    { icon: Trophy, color: DUO.gold, value: progress.best_streak, label: bi("الأفضل", "Best") },
  ];

  return (
    <div className="duo-page min-h-screen bg-background pb-24 overflow-x-hidden" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto">
        {/* === TOP ACTIONS === */}
        <div className="flex items-center justify-between px-5 pt-5">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-12 h-12 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} /> : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="duo-card duo-press w-12 h-12 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            <Settings className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
          </button>
        </div>

        {/* === AVATAR + NAME === */}
        <div className="flex flex-col items-center mt-3 px-5">
          <div className="relative">
            <Avatar
              className="w-28 h-28 cursor-pointer relative"
              onClick={handleAvatarClick}
              style={{ border: "4px solid hsl(var(--duo-surface))", boxShadow: `0 0 0 4px ${DUO.gold}` }}
            >
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username} className="object-cover" />
              <AvatarFallback className="text-4xl font-extrabold text-white" style={{ background: `linear-gradient(160deg, ${DUO.purple}, #a34fd6)` }}>
                {profile?.username?.charAt(0)?.toUpperCase() || <User className="w-12 h-12" />}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="duo-press absolute -bottom-1 rtl:-left-1 ltr:-right-1 w-10 h-10 rounded-2xl flex items-center justify-center disabled:opacity-50"
              style={{ background: DUO.blue, boxShadow: "0 3px 0 #1487c4", border: "3px solid hsl(var(--duo-surface))" }}
            >
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />
              )}
            </button>
          </div>

          <div className="mt-4 text-center">
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="max-w-[180px] text-center text-lg font-extrabold h-11 rounded-2xl"
                  style={{ background: "hsl(var(--duo-surface))", border: "2px solid hsl(var(--duo-border))", color: "hsl(var(--duo-text))" }}
                  placeholder={bi("اسم المستخدم", "Username")}
                  maxLength={30}
                  autoFocus
                />
                <button onClick={handleSaveUsername} disabled={savingName} className="duo-press w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DUO.green, boxShadow: "0 3px 0 #45a300" }}>
                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                </button>
                <button onClick={handleCancelEdit} disabled={savingName} className="duo-press w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--duo-border))" }}>
                  <X className="w-5 h-5" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button onClick={handleEditUsername} className="group inline-flex flex-col items-center">
                <h1 className="text-3xl font-extrabold flex items-center gap-2" style={{ color: "hsl(var(--duo-text))" }}>
                  {profile.username}
                  <Pencil className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--duo-muted))" }} />
                </h1>
                <p className="text-sm font-semibold mt-1 flex items-center justify-center gap-1.5" style={{ color: "hsl(var(--duo-muted))" }}>
                  <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {t('profile.memberSince')} {new Date(profile.created_at).toLocaleDateString('ar-EG')}
                </p>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="duo-press mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-sm text-white"
                style={{ background: DUO.purple, boxShadow: "0 3px 0 #a34fd6" }}
              >
                <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
                {bi("لوحة الأدمن", "Admin")}
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />

        <div className="px-5 mt-7 space-y-3">
          {/* === STATS GRID === */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="duo-card p-3.5 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}22` }}>
                    <Icon className="w-6 h-6" style={{ color: stat.color }} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-extrabold leading-none" style={{ color: "hsl(var(--duo-text))" }}>{stat.value}</div>
                    <div className="text-xs font-bold mt-1 truncate" style={{ color: "hsl(var(--duo-muted))" }}>{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* === PROGRESS RING CARD === */}
          <div className="duo-card p-5">
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
                <svg width={ringSize} height={ringSize} className="-rotate-90">
                  <circle cx={ringSize/2} cy={ringSize/2} r={radius} fill="none" stroke="hsl(var(--duo-border))" strokeWidth={strokeW} />
                  <motion.circle
                    cx={ringSize/2} cy={ringSize/2} r={radius} fill="none"
                    stroke={DUO.green}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold leading-none" style={{ color: "hsl(var(--duo-text))" }}>
                    {progressPct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-bold mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                    {bi("مكتمل", "complete")}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-base font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{t('profile.journeyStats')}</h3>
                  <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                    {getCurrentStageDaysCompleted()} / {getCurrentStageTotalDays()} {bi("يوم", "days")}
                  </p>
                </div>

                <div className="flex gap-2">
                  {[1, 2, 3].map((stage, i) => {
                    const status = getStageStatus(stage);
                    const StageIcon = stageIcons[i];
                    const active = status === 'current';
                    const done = status === 'completed';
                    return (
                      <div
                        key={stage}
                        className="flex-1 rounded-2xl py-2 text-center"
                        style={{
                          background: active ? stageColors[i] : done ? `${stageColors[i]}26` : "hsl(var(--duo-border) / 0.4)",
                        }}
                      >
                        <StageIcon
                          className="w-4 h-4 mx-auto"
                          style={{ color: active ? "#fff" : done ? stageColors[i] : "hsl(var(--duo-muted))" }}
                          strokeWidth={2.5}
                        />
                        <div
                          className="text-[11px] font-extrabold leading-none mt-1"
                          style={{ color: active ? "#fff" : done ? stageColors[i] : "hsl(var(--duo-muted))" }}
                        >
                          {active ? `${progress.current_day}/${getStageDays(stage)}` : getStageDays(stage)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* === INFO CARDS === */}
          <div className="grid grid-cols-2 gap-3">
            <div className="duo-card p-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DUO.blue}22` }}>
                <Calendar className="w-5 h-5" style={{ color: DUO.blue }} strokeWidth={2.5} />
              </div>
              <div className="text-xs font-bold mt-3" style={{ color: "hsl(var(--duo-muted))" }}>{t('profile.startDate')}</div>
              <div className="text-sm font-extrabold mt-0.5" style={{ color: "hsl(var(--duo-text))" }}>{startDate}</div>
            </div>
            <div className="duo-card p-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DUO.purple}22` }}>
                <Zap className="w-5 h-5" style={{ color: DUO.purple }} strokeWidth={2.5} />
              </div>
              <div className="text-xs font-bold mt-3" style={{ color: "hsl(var(--duo-muted))" }}>{bi("المرحلة", "Stage")}</div>
              <div className="text-sm font-extrabold mt-0.5" style={{ color: "hsl(var(--duo-text))" }}>{getStageName(progress.stage_level)}</div>
            </div>
          </div>

          {/* === ACHIEVEMENT === */}
          {progress.stage_level > 1 && (
            <div className="rounded-[1.25rem] p-5 relative overflow-hidden" style={{ background: DUO.gold, boxShadow: "0 4px 0 #d9a800" }}>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)" }}>
                  <Medal className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">
                    {progress.stage_level === 2 ? t('profile.completedStage1') : t('profile.completedStage1And2')}
                  </div>
                  <div className="text-sm font-semibold text-white/90 mt-0.5">
                    {t('profile.daysOfDiscipline', { days: progress.stage_level === 2 ? 21 : 66 })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === LOGOUT === */}
          <button
            onClick={handleLogout}
            className="duo-press w-full py-3.5 rounded-2xl font-extrabold text-white flex items-center justify-center gap-2 mt-1"
            style={{ background: DUO.red, boxShadow: "0 4px 0 #e63e3e" }}
          >
            <LogOut className="w-5 h-5" strokeWidth={2.5} />
            <span>{bi("تسجيل الخروج", "Sign Out")}</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
