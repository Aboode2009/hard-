import { motion } from "framer-motion";
import { useTimers } from "@/hooks/useTimers";
import { cn } from "@/lib/utils";
import { Lock, Check, Star, Gift } from "lucide-react";
import { useState } from "react";

interface PathNodeProps {
  index: number;
  status: "completed" | "current" | "locked";
  xPosition: number;
  yPosition: number;
  avatarUrl?: string | null;
  starsEarned?: number;
  isTreasureChest?: boolean;
  onClick: () => void;
}

export const PathNode = ({
  index,
  status,
  xPosition,
  yPosition,
  avatarUrl,
  starsEarned = 0,
  isTreasureChest,
  onClick,
}: PathNodeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  /** Auto-cleared on unmount. */
  const after = useTimers();

  const handleClick = () => {
    if (status === "locked") {
      setShowTooltip(true);
      after(() => setShowTooltip(false), 2000);
    }
    onClick();
  };

  const nodeSize = status === "current" ? 72 : 56;
  const halfSize = nodeSize / 2;

  if (isTreasureChest) {
    return (
      <motion.div
        className="absolute cursor-pointer"
        style={{
          left: xPosition - 36,
          top: yPosition - 36,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.05, type: "spring" }}
        onClick={handleClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className={cn(
            "w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-lg",
            status === "completed"
              ? "bg-gradient-to-br from-yellow-400 to-amber-500"
              : status === "current"
              ? "bg-gradient-to-br from-purple-500 to-indigo-600"
              : "bg-muted"
          )}
          animate={
            status === "current"
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(168, 85, 247, 0.4)",
                    "0 0 0 20px rgba(168, 85, 247, 0)",
                  ],
                }
              : {}
          }
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Gift
            className={cn(
              "w-8 h-8",
              status === "completed"
                ? "text-yellow-900"
                : status === "current"
                ? "text-white"
                : "text-muted-foreground"
            )}
          />
        </motion.div>
        {status === "completed" && (
          <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: xPosition - halfSize,
        top: yPosition - halfSize,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05, type: "spring" }}
      onClick={handleClick}
    >
      {/* Locked tooltip */}
      {showTooltip && status === "locked" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 shadow-lg"
        >
          Complete previous level first!
        </motion.div>
      )}

      {/* Main node */}
      <motion.div
        className={cn(
          "rounded-full flex items-center justify-center shadow-lg border-4 transition-all",
          status === "completed" &&
            "bg-gradient-to-br from-green-400 to-emerald-500 border-green-300",
          status === "current" &&
            "bg-gradient-to-br from-primary to-purple-600 border-primary/50",
          status === "locked" && "bg-muted border-muted-foreground/20"
        )}
        style={{ width: nodeSize, height: nodeSize }}
        animate={
          status === "current"
            ? {
                y: [0, -8, 0],
                boxShadow: [
                  "0 0 0 0 hsl(var(--primary) / 0.4)",
                  "0 0 0 16px hsl(var(--primary) / 0)",
                ],
              }
            : status === "locked"
            ? {}
            : {}
        }
        transition={
          status === "current"
            ? { y: { repeat: Infinity, duration: 2 }, boxShadow: { repeat: Infinity, duration: 1.5 } }
            : {}
        }
        whileHover={status !== "locked" ? { scale: 1.1 } : {}}
        whileTap={status === "locked" ? { x: [0, -5, 5, -5, 5, 0] } : { scale: 0.95 }}
      >
        {status === "completed" && (
          <div className="flex gap-0.5">
            {[1, 2, 3].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-4 h-4",
                  star <= starsEarned
                    ? "text-yellow-300 fill-yellow-300"
                    : "text-green-700/30"
                )}
              />
            ))}
          </div>
        )}
        {status === "current" && (
          <span className="text-lg font-bold text-primary-foreground">
            {index + 1}
          </span>
        )}
        {status === "locked" && (
          <Lock className="w-5 h-5 text-muted-foreground" />
        )}
      </motion.div>

      {/* Avatar on current node */}
      {status === "current" && (
        <motion.div
          className="absolute -top-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <div className="w-12 h-12 rounded-full border-3 border-white shadow-lg overflow-hidden bg-primary">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <span className="text-white text-lg font-bold">👤</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Day number label */}
      <div
        className={cn(
          "absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium",
          status === "completed" && "text-green-600 dark:text-green-400",
          status === "current" && "text-primary",
          status === "locked" && "text-muted-foreground"
        )}
      >
        Day {index + 1}
      </div>
    </motion.div>
  );
};
