import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Gift, ArrowRightLeft } from "lucide-react";
import { AvatarWithFrame } from "@/components/cosmetics/AvatarWithFrame";
import { UserLevelBadge } from "@/components/rpg/UserLevelBadge";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HomeHeaderProps {
  avatarUrl?: string | null;
  username?: string;
  selectedFilter?: string;
  totalPoints?: number;
  onFilterChange?: (filter: string) => void;
  onAvatarClick?: () => void;
  frameClass?: string | null;
  badgeEmoji?: string | null;
  lootBoxes?: number;
  level?: number;
  showSwitchButton?: boolean;
  /** Where the switch button navigates. Default "/" (NASS → main challenge). */
  switchTo?: string;
  /** Tooltip for the switch button. */
  switchTitle?: string;
}

export const HomeHeader = ({
  avatarUrl,
  username = "User",
  selectedFilter = "all",
  totalPoints = 0,
  onFilterChange,
  onAvatarClick,
  frameClass,
  badgeEmoji,
  lootBoxes = 0,
  level = 1,
  showSwitchButton = false,
  switchTo = "/",
  switchTitle,
}: HomeHeaderProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === 'ar';

  const filters = [
    { id: "all", label: bi("الكل", "All") },
    { id: "pending", label: bi("قيد التنفيذ", "Pending") },
    { id: "completed", label: bi("مكتمل", "Completed") },
  ];

  const currentFilter = filters.find(f => f.id === selectedFilter);

  const handleSwitchToMainChallenge = () => {
    navigate(switchTo);
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between px-4 py-3"
    >
      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-card border-2 border-border shadow-[0_4px_0_hsl(var(--border))] active:shadow-[0_0px_0_transparent] active:translate-y-1 transition-all text-sm font-bold text-foreground"
          >
            {currentFilter?.label}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {filters.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              onClick={() => onFilterChange?.(filter.id)}
              className={selectedFilter === filter.id ? "bg-primary/10" : ""}
            >
              {filter.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Level Badge with Username */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        className="flex-1 flex justify-center"
      >
        <UserLevelBadge
          level={level}
          username={username}
          badgeEmoji={badgeEmoji}
          size="sm"
        />
      </motion.div>

      {/* Avatar with Frame and Switch Button */}
      <div className="flex items-center gap-2">
        {/* Switch to Main Challenge Button - Only for NASS employees */}
        {showSwitchButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 400, damping: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSwitchToMainChallenge}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
            title={switchTitle ?? bi("التحدي الرئيسي", "Main Challenge")}
          >
            <ArrowRightLeft className="w-5 h-5 text-primary-foreground" />
          </motion.button>
        )}

        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative"
        >
          <AvatarWithFrame
            avatarUrl={avatarUrl}
            username={username}
            frameClass={frameClass}
            badgeEmoji={badgeEmoji}
            size="md"
            onClick={onAvatarClick}
          />
          
          {/* Loot box indicator */}
          {lootBoxes > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
              className="absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center"
            >
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <Gift className="w-3 h-3 text-white" />
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.header>
  );
};
