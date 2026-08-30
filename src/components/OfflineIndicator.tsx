import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { bi } from "@/i18n/bi";
import { WifiOff, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export const OfflineIndicator = () => {
  const { isOnline } = useOfflineStatus();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowOnlineMessage(true);
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {(!isOnline || showOnlineMessage) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="duo-page fixed top-2 left-3 right-3 z-[9999] py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-bold text-white rounded-2xl"
          style={
            isOnline
              ? { background: "#58CC02", boxShadow: "0 3px 0 #45A302" }
              : { background: "#FF4B4B", boxShadow: "0 3px 0 #E63E3E" }
          }
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" strokeWidth={2.5} />
              <span>{bi("عاد الاتصال بالإنترنت", "Back online")}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" strokeWidth={2.5} />
              <span>{bi("لا يوجد اتصال بالإنترنت - الوضع غير متصل", "No internet - Offline mode")}</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
