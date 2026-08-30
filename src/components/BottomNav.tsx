import { NativeTabBar, type TabItem } from "@/components/NativeTabBar";
import { HomeIcon, StatsIcon, StoreIcon, ProfileIcon, SettingsIcon } from "@/components/nav-icons";

const items: TabItem[] = [
  { path: "/", Icon: HomeIcon },
  { path: "/overall", Icon: StatsIcon },
  { path: "/store", Icon: StoreIcon },
  { path: "/profile", Icon: ProfileIcon },
  { path: "/settings", Icon: SettingsIcon },
];

export const BottomNav = () => <NativeTabBar items={items} />;
