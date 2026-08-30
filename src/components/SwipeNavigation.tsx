import { ReactNode, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, PanInfo } from "framer-motion";
import { useTranslation } from "react-i18next";

interface SwipeNavigationProps {
  children: ReactNode;
}

const MAIN_ROUTES = ["/", "/overall", "/store", "/profile", "/settings"];
const SWIPE_THRESHOLD = 50;

export const SwipeNavigation = ({ children }: SwipeNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const isDragging = useRef(false);

  const currentIndex = MAIN_ROUTES.indexOf(location.pathname);
  const isMainRoute = currentIndex !== -1;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (!isMainRoute) return;

    const { offset, velocity } = info;
    const swipeThreshold = SWIPE_THRESHOLD;
    const velocityThreshold = 500;

    // Determine swipe direction based on offset or velocity
    const isSwipeLeft = offset.x < -swipeThreshold || velocity.x < -velocityThreshold;
    const isSwipeRight = offset.x > swipeThreshold || velocity.x > velocityThreshold;

    // For Arabic (RTL), reverse the navigation direction
    const shouldGoNext = isArabic ? isSwipeRight : isSwipeLeft;
    const shouldGoPrev = isArabic ? isSwipeLeft : isSwipeRight;

    if (shouldGoNext && currentIndex < MAIN_ROUTES.length - 1) {
      navigate(MAIN_ROUTES[currentIndex + 1]);
    } else if (shouldGoPrev && currentIndex > 0) {
      navigate(MAIN_ROUTES[currentIndex - 1]);
    }

    isDragging.current = false;
  };

  if (!isMainRoute) {
    return <>{children}</>;
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragStart={() => { isDragging.current = true; }}
      onDragEnd={handleDragEnd}
      className="w-full h-full touch-pan-y"
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </motion.div>
  );
};
