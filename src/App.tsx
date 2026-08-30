import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense, useEffect, useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { PageTransition } from "@/components/PageTransition";
import { SwipeNavigation } from "@/components/SwipeNavigation";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { buildThemeOverrideCss } from "@/lib/theme-css";
import { registerOAuthDeepLinkListener } from "@/lib/native-oauth";

// Eagerly loaded (main routes)
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy loaded (secondary routes)
const Overall = lazy(() => import("./pages/Overall"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const TaskReminders = lazy(() => import("./pages/TaskReminders"));
const Backups = lazy(() => import("./pages/Backups"));
const Paths = lazy(() => import("./pages/Paths"));
const PathTasks = lazy(() => import("./pages/PathTasks"));
const Calendar = lazy(() => import("./pages/Calendar"));
const CreateTask = lazy(() => import("./pages/CreateTask"));
const CustomHabit = lazy(() => import("./pages/CustomHabit"));
const Points = lazy(() => import("./pages/Points"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Store = lazy(() => import("./pages/Store"));
const ThemeStorePage = lazy(() => import("./pages/ThemeStorePage"));
const Install = lazy(() => import("./pages/Install"));
const NassChallenge = lazy(() => import("./pages/NassChallenge"));
const NassLeaderboard = lazy(() => import("./pages/NassLeaderboard"));
const NassStore = lazy(() => import("./pages/NassStore"));
const StoryMode = lazy(() => import("./pages/StoryMode"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Apply saved theme colors on app load with light/dark mode support
const applySavedTheme = () => {
  const savedColors = localStorage.getItem('activeThemeColors');
  if (savedColors) {
    try {
      const themeData = JSON.parse(savedColors);

      let styleEl = document.getElementById('theme-override-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'theme-override-styles';
        document.head.appendChild(styleEl);
      }

      if (themeData.light) {
        // New format with light/dark keys
        styleEl.textContent = buildThemeOverrideCss(themeData.light, themeData.dark);
      } else {
        // Legacy format (flat palette) — light mode only; inline styles are
        // never used because they would override .dark for every variable
        styleEl.textContent = buildThemeOverrideCss(themeData);
      }
    } catch (e) {
      console.error("Error applying saved theme:", e);
    }
  }
};

// Apply dark/light mode class on initial load
const applyInitialMode = () => {
  const savedTheme = localStorage.getItem('theme') || 'system';
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  
  if (savedTheme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(savedTheme);
  }
};

// Apply mode first, then theme colors
applyInitialMode();
applySavedTheme();

/**
 * Completes a native OAuth flow: Clerk reads the one-time nonce from the URL
 * (routed here by the deep-link listener), exchanges it for a session, and
 * redirects to "/". Harmless on web — only the native flow reaches it.
 */
const SsoCallback = () => (
  <div className="flex min-h-[100dvh] items-center justify-center bg-background">
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl="/"
      signUpForceRedirectUrl="/"
    />
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

/**
 * Registers the Capacitor deep-link listener once, so Clerk's redirect back
 * into the app routes to /sso-callback. No-op on web.
 */
const NativeOAuthListener = () => {
  const navigate = useNavigate();
  useEffect(() => registerOAuthDeepLinkListener((path) => navigate(path)), [navigate]);
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      {/* No loading screen between routes: lazy chunks are precached (PWA) and
          bundled locally on native, so they resolve instantly. */}
      <Suspense fallback={null}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/overall" element={<PageTransition><Overall /></PageTransition>} />
          <Route path="/paths" element={<PageTransition><Paths /></PageTransition>} />
          <Route path="/path/:pathId" element={<PageTransition><PathTasks /></PageTransition>} />
          <Route path="/calendar" element={<PageTransition><Calendar /></PageTransition>} />
          <Route path="/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="/reminders" element={<PageTransition><TaskReminders /></PageTransition>} />
          <Route path="/backups" element={<PageTransition><Backups /></PageTransition>} />
          <Route path="/create-task" element={<PageTransition><CreateTask /></PageTransition>} />
          <Route path="/custom-habit" element={<PageTransition><CustomHabit /></PageTransition>} />
          <Route path="/points" element={<PageTransition><Points /></PageTransition>} />
          <Route path="/rewards" element={<PageTransition><Rewards /></PageTransition>} />
          <Route path="/achievements" element={<PageTransition><Achievements /></PageTransition>} />
          <Route path="/store" element={<PageTransition><Store /></PageTransition>} />
          <Route path="/theme-store" element={<PageTransition><ThemeStorePage /></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          <Route path="/nass" element={<PageTransition><NassChallenge /></PageTransition>} />
          <Route path="/nass/leaderboard" element={<PageTransition><NassLeaderboard /></PageTransition>} />
          <Route path="/nass/store" element={<PageTransition><NassStore /></PageTransition>} />
          <Route path="/story-mode" element={<PageTransition><StoryMode /></PageTransition>} />
          <Route path="/sso-callback" element={<SsoCallback />} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};
const App = () => {
  // Startup logo animation — App mounts once per launch, so this never
  // replays on route navigation. The app renders underneath and is revealed
  // when the splash fades out.
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <OfflineIndicator />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NativeOAuthListener />
          <SwipeNavigation>
            <AnimatedRoutes />
          </SwipeNavigation>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
