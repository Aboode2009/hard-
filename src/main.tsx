import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { ProfileBootstrap } from "./components/ProfileBootstrap.tsx";
// Duolingo-style rounded font (Arabic + Latin) used by the Profile page.
import "@fontsource/baloo-bhaijaan-2/400.css";
import "@fontsource/baloo-bhaijaan-2/500.css";
import "@fontsource/baloo-bhaijaan-2/600.css";
import "@fontsource/baloo-bhaijaan-2/700.css";
import "@fontsource/baloo-bhaijaan-2/800.css";
import "./index.css";
import "./i18n/config";
import {
  installCompanyModeSignOutCleanup,
  redirectToCompanyBeforeFirstPaint,
} from "./lib/company-mode";

/**
 * Authentication is Supabase's, end to end. There is no auth provider to wrap
 * the tree in: the Supabase client owns the session, persists it, refreshes it
 * and exposes it through `supabase.auth`, so components just ask it directly.
 */
console.info("[boot] origin=%s", window.location.origin);

// Company users open straight into company mode: the URL is corrected before
// React renders anything, so the personal challenge never flashes first.
redirectToCompanyBeforeFirstPaint();
installCompanyModeSignOutCleanup();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ProfileBootstrap />
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
