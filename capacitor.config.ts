import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hardchallenge.app',
  appName: 'Hard Challenge',
  // The web app is bundled locally inside the APK (no remote server.url —
  // the old Lovable preview URL made the APK load the outdated hosted build)
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
};

export default config;
