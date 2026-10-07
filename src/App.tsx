import { Toaster } from "@/components/ui/toaster";
import { lazy, startTransition, Suspense, useEffect, useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { queryClient } from "@/lib/query-client";
import { cameFromCompany, companyModeForStoredUser } from "@/lib/company-mode";
import {
  loadNassChallenge, loadNassLeaderboard, loadNassStore,
  loadOverall, loadProfile, loadSettings, loadStore, preloadTabs,
} from "@/lib/route-preload";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";
import { SwipeNavigation } from "@/components/SwipeNavigation";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { buildThemeOverrideCss } from "@/lib/theme-css";
import { syncStatusBarWithTheme } from "@/lib/status-bar";
import { adsAvailable, showInterstitial, warmUpAds } from "@/lib/ads";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { CompanyAccessGate } from "@/components/CompanyAccessGate";
import { RouteFallback } from "@/components/RouteFallback";
import { EntitlementsRefresher } from "@/components/EntitlementsRefresher";
import { WidgetBridge } from "@/components/WidgetBridge";
import { PasswordRecoveryHandler } from "@/components/PasswordRecoveryHandler";

// Eagerly loaded (main routes)
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy loaded (secondary routes)
const Overall = lazy(loadOverall);
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(loadProfile);
const Settings = lazy(loadSettings);
const Backups = lazy(() => import("./pages/Backups"));
const Paths = lazy(() => import("./pages/Paths"));
const PathTasks = lazy(() => import("./pages/PathTasks"));
const Calendar = lazy(() => import("./pages/Calendar"));
const CreateTask = lazy(() => import("./pages/CreateTask"));
const CustomHabit = lazy(() => import("./pages/CustomHabit"));
const Points = lazy(() => import("./pages/Points"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Store = lazy(loadStore);
const ThemeStorePage = lazy(() => import("./pages/ThemeStorePage"));
const Install = lazy(() => import("./pages/Install"));
const NassChallenge = lazy(loadNassChallenge);
const NassLeaderboard = lazy(loadNassLeaderboard);
const NassStore = lazy(loadNassStore);
const StoryMode = lazy(() => import("./pages/StoryMode"));
const Premium = lazy(() => import("./pages/Premium"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

/**
 * "/" for a user remembered as a company user goes straight to /nass, without
 * mounting the personal challenge first. Cold starts are already redirected in
 * main.tsx; this covers in-app arrivals such as the redirect after sign-in.
 * `/?from=nass` is the deliberate switch to the personal challenge.
 */
const HomeRoute = () => {
  const location = useLocation();
  if (!cameFromCompany(location.search) && companyModeForStoredUser()) {
    return <Navigate to="/nass" replace />;
  }
  return <Index />;
};

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
syncStatusBarWithTheme();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      {/* No AnimatePresence / mode="wait": the outgoing page is not animated
          out, so the next one mounts on the tap instead of 0.3s later.
          A lazy chunk still has to be read, parsed and executed — on a cold
          native WebView that is long enough to show as a blank screen, so the
          fallback is a real placeholder rather than null. The boundary is
          keyed by path so an error on one route does not blank the whole app
          and clears itself on the next navigation. */}
      <RouteErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><HomeRoute /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/overall" element={<PageTransition><Overall /></PageTransition>} />
          <Route path="/paths" element={<PageTransition><Paths /></PageTransition>} />
          <Route path="/path/:pathId" element={<PageTransition><PathTasks /></PageTransition>} />
          <Route path="/calendar" element={<PageTransition><Calendar /></PageTransition>} />
          <Route path="/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="/backups" element={<PageTransition><Backups /></PageTransition>} />
          <Route path="/create-task" element={<PageTransition><CreateTask /></PageTransition>} />
          <Route path="/custom-habit" element={<PageTransition><CustomHabit /></PageTransition>} />
          <Route path="/points" element={<PageTransition><Points /></PageTransition>} />
          <Route path="/rewards" element={<PageTransition><Rewards /></PageTransition>} />
          <Route path="/achievements" element={<PageTransition><Achievements /></PageTransition>} />
          <Route path="/store" element={<PageTransition><Store /></PageTransition>} />
          <Route path="/theme-store" element={<PageTransition><ThemeStorePage /></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          {/*
            Company mode is premium-only. The gate re-asks the server on every
            mount, so access that lapses closes on the next navigation rather
            than at the next launch. The database refuses these users anyway —
            this turns that refusal into an explanation.
          */}
          <Route path="/nass" element={<CompanyAccessGate><PageTransition><NassChallenge /></PageTransition></CompanyAccessGate>} />
          <Route path="/nass/leaderboard" element={<CompanyAccessGate><PageTransition><NassLeaderboard /></PageTransition></CompanyAccessGate>} />
          <Route path="/nass/store" element={<CompanyAccessGate><PageTransition><NassStore /></PageTransition></CompanyAccessGate>} />
          <Route path="/story-mode" element={<PageTransition><StoryMode /></PageTransition>} />
          <Route path="/premium" element={<PageTransition><Premium /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </>
  );
};
/** Calls `run` once, after the tree it sits in has committed. */
const OnCommitted = ({ run }: { run: () => void }) => {
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

const App = () => {
  // Startup logo animation — App mounts once per launch, so this never
  // replays on route navigation. The app renders underneath and is revealed
  // when the splash fades out.
  const [showSplash, setShowSplash] = useState(true);
  // The app tree is built as a transition after the splash's first frame:
  // React then renders it in small time slices instead of one long task, so
  // the launch animation keeps its frames while the app boots underneath.
  const [appMounted, setAppMounted] = useState(false);
  useEffect(() => {
    startTransition(() => setAppMounted(true));
  }, []);
  // Set once that tree has committed. The splash starts its animation only
  // then, so the commit (one unavoidable long task) lands on its dark
  // opening frame instead of freezing the reels.
  const [appCommitted, setAppCommitted] = useState(false);


  // Ads are warmed up well after first paint. Initializing the AdMob SDK is
  // heavy native work: doing it during startup competed with the app's own
  // rendering and was a direct cause of the launch stutter.
  //
  // The app-open interstitial is then shown from the *preloaded* ad, so it
  // never fetches while the user is waiting. If nothing loaded in time it is
  // silently skipped — an ad must never delay the home screen.
  // Once the first screen is showing: warm the other tabs' code and data in
  // idle time, and again right after a sign-in on this launch.
  useEffect(() => {
    if (showSplash) return;
    preloadTabs();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setTimeout(preloadTabs, 0);
    });
    return () => subscription.unsubscribe();
  }, [showSplash]);

  useEffect(() => {
    if (showSplash) return;
    // With ads off (config/ads.ts ADS_ENABLED) there is nothing to warm up, so
    // no timers are scheduled at all rather than firing into no-ops.
    if (!adsAvailable) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        void warmUpAds().then(() => {
          if (cancelled) return;
          timers.push(
            setTimeout(() => {
              if (!cancelled) void showInterstitial();
            }, 1500),
          );
        });
      }, 2500),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [showSplash]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <SplashScreen appCommitted={appCommitted} onComplete={() => setShowSplash(false)} />}
        <OfflineIndicator />
        <Toaster />
        <Sonner />
        {/* v7_startTransition: navigations render as a React transition, so
            a route that suspends (its lazy chunk — React.lazy suspends on the
            first render even when the module is already loaded) keeps the
            current page on screen instead of swapping it for the full-screen
            RouteFallback spinner for a few frames. */}
        {appMounted && (
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <OnCommitted run={() => setAppCommitted(true)} />
            <EntitlementsRefresher />
            <WidgetBridge />
            <PasswordRecoveryHandler />
            <SwipeNavigation>
              <AnimatedRoutes />
            </SwipeNavigation>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
