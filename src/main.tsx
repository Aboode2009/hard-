import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { arSA } from "@clerk/localizations";
import App from "./App.tsx";
import { ProfileBootstrap } from "./components/ProfileBootstrap.tsx";
// Duolingo-style rounded font (Arabic + Latin) used by the Profile page.
import "@fontsource/baloo-bhaijaan-2/400.css";
import "@fontsource/baloo-bhaijaan-2/500.css";
import "@fontsource/baloo-bhaijaan-2/600.css";
import "@fontsource/baloo-bhaijaan-2/700.css";
import "@fontsource/baloo-bhaijaan-2/800.css";
import "./index.css";
import "./i18n/config";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  // Surfaces a clear message instead of a cryptic Clerk runtime error.
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to your .env file.");
}

// Clerk's prebuilt forms ship their own strings; use the Arabic pack when the
// app language is Arabic. Language switches trigger a full reload, so a static
// read here stays in sync (mirrors the detection in i18n/config).
const isArabic = (localStorage.getItem("language") || navigator.language || "en").startsWith("ar");

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/auth"
      localization={isArabic ? arSA : undefined}
    >
      <ProfileBootstrap />
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
