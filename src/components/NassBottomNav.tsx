import { NativeTabBar, type TabItem } from "@/components/NativeTabBar";
import { TargetIcon, TrophyIcon, ChestIcon, ProfileIcon, SettingsIcon } from "@/components/nav-icons";

const items: TabItem[] = [
  { path: "/nass", Icon: TargetIcon },
  { path: "/nass/leaderboard", Icon: TrophyIcon },
  { path: "/nass/store", Icon: ChestIcon },
  { path: "/profile", Icon: ProfileIcon },
  { path: "/settings", Icon: SettingsIcon },
];

export const NassBottomNav = () => <NativeTabBar items={items} />;
