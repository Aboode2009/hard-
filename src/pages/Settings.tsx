import { useEffect, useState } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { FlagIcon } from "@/components/FlagIcon";
import {
  GlobeIcon, ThemeIcon, PaletteIcon, CalendarIcon, GiftIcon, MedalIcon,
  TrophyIcon, TrailIcon, HomeIcon, AddTaskIcon, BellIcon,
  BuildingIcon, KeyIcon, AdminShieldIcon, DatabaseIcon, TrashIcon,
} from "@/components/nav-icons";
import { Input } from "@/components/ui/input";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { PasswordResetDialog } from "@/components/PasswordResetDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { languages } from "@/i18n/config";

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  /** Duolingo accent for the icon chip */
  color?: string;
}

const SettingsItem = ({ icon, label, value, onClick, rightElement, danger, color = "#1CB0F6" }: SettingsItemProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const accent = danger ? "#FF4B4B" : color;

  return (
    <button
      onClick={onClick}
      className="duo-card duo-press w-full flex items-center justify-between px-4 py-3.5"
      disabled={!onClick && !rightElement}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}1e` }}
        >
          {icon}
        </div>
        <span className="font-bold" style={{ color: danger ? "#FF4B4B" : "hsl(var(--duo-text))" }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>{value}</span>
        )}
        {rightElement || (onClick && (
          isArabic ? (
            <ChevronLeft className="w-5 h-5" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
          )
        ))}
      </div>
    </button>
  );
};

const SettingsSection = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div>
    {title && (
      <p className="text-xs font-extrabold tracking-wider mb-2.5 px-1" style={{ color: "hsl(var(--duo-muted))" }}>
        {title}
      </p>
    )}
    {/* Each item is its own standalone card (like the home task cards) */}
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const Settings = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showCompanyCodeDialog, setShowCompanyCodeDialog] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [currentCompanyCode, setCurrentCompanyCode] = useState<string | null>(null);
  const [savingCompanyCode, setSavingCompanyCode] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('theme') || 'system';
  });

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch user's company code
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_code")
        .eq("id", user.id)
        .single();
      
      if (profile?.company_code) {
        setCurrentCompanyCode(profile.company_code);
      }

      const { data: isAdminData } = await supabase.rpc('is_admin');
      if (isAdminData) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyCode = async () => {
    if (!companyCode.trim()) return;
    
    setSavingCompanyCode(true);
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const upperCode = companyCode.toUpperCase();
      
      const { error } = await supabase
        .from("profiles")
        .update({ company_code: upperCode })
        .eq("id", user.id);

      if (error) throw error;

      setCurrentCompanyCode(upperCode);
      setShowCompanyCodeDialog(false);
      setCompanyCode("");

      toast({
        title: bi("تم الحفظ", "Saved"),
        description: bi("تم تحديث كود الشركة بنجاح", "Company code updated successfully"),
      });

      // Redirect based on company code
      if (upperCode === "NASS") {
        navigate("/nass");
      } else if (upperCode === "TASK") {
        navigate("/");
      }
    } catch (error) {
      console.error("Error saving company code:", error);
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: bi("حدث خطأ أثناء حفظ الكود", "Error saving company code"),
      });
    } finally {
      setSavingCompanyCode(false);
    }
  };

  const handleLanguageChange = (langCode: string) => {
    const lang = languages.find(l => l.code === langCode);
    if (!lang) return;

    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = langCode;
    
    setShowLanguageDialog(false);
    
    toast({
      title: t('settings.saved'),
      description: t('settings.languageUpdated'),
    });
  };

  const handleThemeChange = () => {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const newTheme = themes[(currentIndex + 1) % themes.length];
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
    
    toast({
      title: t('settings.saved'),
      description: t('settings.themeUpdated'),
    });
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return t('settings.light');
      case 'dark': return t('settings.dark');
      default: return t('settings.system');
    }
  };

  const getThemeIcon = () => <ThemeIcon className="w-6 h-6" />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={bi("rtl", "ltr")}>
      {/* Header */}
      <div className="max-w-lg mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isRTL ? (
              <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            ) : (
              <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            )}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {t('settings.title')}
          </h1>
          <div className="w-11" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5">
        {/* Preferences Section */}
        <SettingsSection title={bi("التفضيلات", "PREFERENCES")}>
          <SettingsItem
            icon={<GlobeIcon className="w-6 h-6" />}
            color="#1CB0F6"
            label={t('settings.language')}
            value={currentLanguage.nativeName}
            onClick={() => setShowLanguageDialog(true)}
          />
          <SettingsItem
            icon={getThemeIcon()}
            color="#CE82FF"
            label={t('settings.theme')}
            value={getThemeLabel()}
            onClick={handleThemeChange}
          />
          <SettingsItem
            icon={<PaletteIcon className="w-6 h-6" />}
            color="#E5A55D"
            label={bi("متجر المظاهر", "Theme Store")}
            onClick={() => navigate("/theme-store")}
          />
        </SettingsSection>

        {/* Features Section */}
        <SettingsSection title={bi("الميزات", "FEATURES")}>
          <SettingsItem
            icon={<CalendarIcon className="w-6 h-6" />}
            color="#FF4B4B"
            label={bi("التقويم", "Calendar")}
            onClick={() => navigate("/calendar")}
          />
          <SettingsItem
            icon={<GiftIcon className="w-6 h-6" />}
            color="#FF4B4B"
            label={bi("المكافآت", "Rewards")}
            onClick={() => navigate("/rewards")}
          />
          <SettingsItem
            icon={<MedalIcon className="w-6 h-6" />}
            color="#FFC800"
            label={bi("الإنجازات", "Achievements")}
            onClick={() => navigate("/achievements")}
          />
          <SettingsItem
            icon={<TrophyIcon className="w-6 h-6" />}
            color="#FFC800"
            label={bi("قائمة المتصدرين", "Leaderboard")}
            onClick={() => navigate("/leaderboard")}
          />
          <SettingsItem
            icon={<TrailIcon className="w-6 h-6" />}
            color="#58CC02"
            label={bi("المسارات", "Paths")}
            onClick={() => navigate("/paths")}
          />
          <SettingsItem
            icon={<HomeIcon className="w-6 h-6" />}
            color="#FF9600"
            label={bi("بيتي", "My Home")}
            onClick={() => navigate("/story-mode")}
          />
        </SettingsSection>

        {/* Tasks Section */}
        <SettingsSection title={bi("المهام", "TASKS")}>
          <SettingsItem
            icon={<AddTaskIcon className="w-6 h-6" />}
            color="#58CC02"
            label={bi("إضافة مهمة", "Add Task")}
            onClick={() => navigate("/create-task")}
          />
          <SettingsItem
            icon={<BellIcon className="w-6 h-6" />}
            color="#FFC800"
            label={bi("التذكيرات", "Reminders")}
            onClick={() => navigate("/reminders")}
          />
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection title={bi("الحساب", "ACCOUNT")}>
          <SettingsItem
            icon={<BuildingIcon className="w-6 h-6" />}
            color="#1CB0F6"
            label={bi("كود الشركة", "Company Code")}
            value={currentCompanyCode || (bi("غير محدد", "Not set"))}
            onClick={() => setShowCompanyCodeDialog(true)}
          />
          <div className="duo-card px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#FFC8001e" }}
                >
                  <KeyIcon className="w-6 h-6" />
                </div>
                <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>
                  {bi("تغيير كلمة المرور", "Change Password")}
                </span>
              </div>
              <PasswordResetDialog
                trigger={
                  <Button variant="outline" size="sm">
                    {bi("تغيير", "Change")}
                  </Button>
                }
              />
            </div>
          </div>
        </SettingsSection>

        {/* Admin Section */}
        {isAdmin && (
          <SettingsSection title={bi("الإدارة", "ADMIN")}>
            <SettingsItem
              icon={<AdminShieldIcon className="w-6 h-6" />}
              color="#CE82FF"
              label={bi("لوحة الإدارة", "Admin Panel")}
              onClick={() => navigate("/admin")}
            />
            <SettingsItem
              icon={<DatabaseIcon className="w-6 h-6" />}
              color="#1CB0F6"
              label={bi("النسخ الاحتياطية", "Backups")}
              onClick={() => navigate("/backups")}
            />
          </SettingsSection>
        )}

        {/* Danger Zone */}
        <SettingsSection>
          <div className="duo-card px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#FF4B4B1e" }}
                >
                  <TrashIcon className="w-6 h-6" />
                </div>
                <span className="font-bold" style={{ color: "#FF4B4B" }}>
                  {bi("حذف الحساب", "Delete Account")}
                </span>
              </div>
              <DeleteAccountDialog />
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Language Selection Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="duo-page max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {bi("اختر اللغة", "Select Language")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {languages.map((lang) => {
              const selected = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="duo-press relative flex flex-col items-center gap-2.5 rounded-2xl px-3 py-5"
                  style={{
                    background: "hsl(var(--duo-surface))",
                    border: `2px solid ${selected ? "#58CC02" : "hsl(var(--duo-border))"}`,
                    boxShadow: `0 4px 0 ${selected ? "#45A302" : "hsl(var(--duo-edge))"}`,
                  }}
                >
                  {selected && (
                    <span
                      className="absolute -top-2 -end-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "#58CC02" }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />
                    </span>
                  )}
                  <FlagIcon code={lang.code} className="w-16 h-12" />
                  <div className="text-center leading-tight">
                    <p className="font-extrabold text-sm" style={{ color: "hsl(var(--duo-text))" }}>
                      {lang.nativeName}
                    </p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                      {lang.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Code Dialog */}
      <Dialog open={showCompanyCodeDialog} onOpenChange={setShowCompanyCodeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <BuildingIcon className="w-5 h-5" />
              {bi("كود الشركة", "Company Code")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              {bi("إذا كنت موظفاً في شركة لديها تحدي خاص، أدخل الكود هنا", "If you're an employee with a special company challenge, enter the code here")}
            </p>
            <Input
              placeholder={bi("أدخل كود الشركة", "Enter company code")}
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              className="text-center text-lg"
            />
            {currentCompanyCode && (
              <p className="text-xs text-muted-foreground text-center">
                {isRTL ? `الكود الحالي: ${currentCompanyCode}` : `Current code: ${currentCompanyCode}`}
              </p>
            )}
            <Button 
              onClick={handleSaveCompanyCode} 
              className="w-full"
              disabled={!companyCode.trim() || savingCompanyCode}
            >
              {savingCompanyCode ? "..." : (bi("حفظ", "Save"))}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <BottomNav />
    </div>
  );
};

export default Settings;
