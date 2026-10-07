import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hardchallenge.app',
  appName: 'Hard 21',
  // The web app is bundled locally inside the APK (no remote server.url —
  // the old Lovable preview URL made the APK load the outdated hosted build)
  webDir: 'dist',
  // The WebView's colour before the page paints (matches the launch screen).
  backgroundColor: '#070608',
  server: {
    // Android serves the bundled app over https://localhost, iOS over
    // capacitor://localhost. iOS can't use https: WKWebView keeps that scheme
    // for itself, and Capacitor would quietly fall back to capacitor:// anyway.
    // Both origins are on Supabase's redirect allow-list (src/config/auth.ts).
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  android: {
    // Apple's in-app purchase plugin (@capgo/native-purchases) is iOS only:
    // Android keeps selling through WAYL and must not pick up Play Billing.
    // So Android takes an allowlist — add any NEW plugin here as well.
    includePlugins: [
      '@capacitor-community/admob',
      '@capacitor-mlkit/barcode-scanning',
      '@capacitor/app',
      '@capacitor/app-launcher',
      '@capacitor/browser',
      '@capacitor/local-notifications',
      '@capacitor/share',
      '@capacitor/status-bar',
      '@capgo/capacitor-social-login',
    ],
  },
  ios: {
    // The page handles the notch and home indicator itself (viewport-fit=cover
    // + env(safe-area-inset-*)), as it does edge to edge on Android.
    contentInset: 'never',
    backgroundColor: '#070608',
    // Swipe back/forward is the app's own (SwipeNavigation), not the WebView's.
    allowsLinkPreview: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
};

export default config;
