import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { Download, Share, Plus, Check, Smartphone, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed event. Named so it can be removed too — as an
    // inline arrow it leaked a listener (and a setState on an unmounted
    // component) on every visit to this page.
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={bi("rtl", "ltr")}>
      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
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
            {bi("تثبيت التطبيق", "Install App")}
          </h1>
          <div className="w-11" />
        </div>

        {/* Status Card */}
        <div className="duo-card p-6 text-center">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: isInstalled ? "#58CC0222" : "#1CB0F622" }}
          >
            {isInstalled ? (
              <Check className="h-8 w-8" style={{ color: "#58CC02" }} strokeWidth={3} />
            ) : (
              <Smartphone className="h-8 w-8" style={{ color: "#1CB0F6" }} strokeWidth={2.5} />
            )}
          </div>
          <h2 className="text-xl font-extrabold mb-1" style={{ color: "hsl(var(--duo-text))" }}>
            {isInstalled
              ? bi("التطبيق مثبت!", "App Installed!")
              : bi("ثبّت التطبيق على جهازك", "Install on Your Device")}
          </h2>
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
            {isInstalled
              ? bi("يمكنك الآن استخدام التطبيق من الشاشة الرئيسية", "You can now use the app from your home screen")
              : bi("احصل على تجربة أفضل كتطبيق مستقل", "Get a better experience as a standalone app")}
          </p>
        </div>

        {!isInstalled && (
          <>
            {/* Android / Desktop Install */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="duo-press w-full h-12 rounded-2xl font-extrabold text-white flex items-center justify-center gap-2"
                style={{ background: "#58CC02", boxShadow: "0 4px 0 #45A302" }}
              >
                <Download className="h-5 w-5" strokeWidth={2.5} />
                {bi("تثبيت التطبيق", "Install App")}
              </button>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <div className="duo-card p-5">
                <h3 className="text-lg font-extrabold mb-4" style={{ color: "hsl(var(--duo-text))" }}>
                  {bi("تعليمات التثبيت لـ iPhone", "iPhone Installation")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "#1CB0F622" }}
                    >
                      <span className="text-sm font-extrabold" style={{ color: "#1CB0F6" }}>1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Share className="h-5 w-5" style={{ color: "#1CB0F6" }} strokeWidth={2.5} />
                      <span className="font-semibold" style={{ color: "hsl(var(--duo-text))" }}>
                        {bi("اضغط على زر \"مشاركة\"", "Tap the \"Share\" button")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "#1CB0F622" }}
                    >
                      <span className="text-sm font-extrabold" style={{ color: "#1CB0F6" }}>2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5" style={{ color: "#1CB0F6" }} strokeWidth={2.5} />
                      <span className="font-semibold" style={{ color: "hsl(var(--duo-text))" }}>
                        {bi("اختر \"إضافة إلى الشاشة الرئيسية\"", "Select \"Add to Home Screen\"")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "#1CB0F622" }}
                    >
                      <span className="text-sm font-extrabold" style={{ color: "#1CB0F6" }}>3</span>
                    </div>
                    <span className="font-semibold" style={{ color: "hsl(var(--duo-text))" }}>
                      {bi("اضغط \"إضافة\"", "Tap \"Add\"")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* General Instructions */}
            {!isIOS && !deferredPrompt && (
              <div className="duo-card p-5">
                <h3 className="text-lg font-extrabold mb-3" style={{ color: "hsl(var(--duo-text))" }}>
                  {bi("كيفية التثبيت", "How to Install")}
                </h3>
                <p className="font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                  {bi("افتح قائمة المتصفح واختر 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'", "Open browser menu and select 'Install App' or 'Add to Home Screen'")}
                </p>
              </div>
            )}
          </>
        )}

        {/* Features */}
        <div className="duo-card p-5">
          <h3 className="text-lg font-extrabold mb-4" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("مميزات التطبيق", "App Features")}
          </h3>
          <ul className="space-y-3">
            {[
              bi("يعمل بدون انترنت", "Works offline"),
              bi("تحميل سريع", "Fast loading"),
              bi("إشعارات فورية", "Push notifications"),
              bi("تجربة تطبيق أصلي", "Native app experience"),
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0" style={{ color: "#58CC02" }} strokeWidth={3} />
                <span className="font-semibold" style={{ color: "hsl(var(--duo-text))" }}>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Install;
