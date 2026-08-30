import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Subscribe to language changes so bi() stays reactive (matches other pages).
  useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="duo-page min-h-screen bg-background flex items-center justify-center px-4" dir={bi("rtl", "ltr")}>
      <div className="duo-card w-full max-w-sm p-8 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-5xl font-extrabold mb-2" style={{ color: "hsl(var(--duo-text))" }}>
          404
        </h1>
        <p className="text-lg font-semibold mb-6" style={{ color: "hsl(var(--duo-muted))" }}>
          {bi("عذراً! الصفحة غير موجودة", "Oops! Page not found")}
        </p>
        <button
          onClick={() => navigate("/")}
          className="duo-press w-full h-12 rounded-2xl font-extrabold text-white"
          style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
        >
          {bi("العودة للرئيسية", "Return to Home")}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
