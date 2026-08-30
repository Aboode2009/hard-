import { motion } from "framer-motion";
import { bi } from "@/i18n/bi";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  completedCount: number;
  totalCount: number;
  isArabic?: boolean;
}

export const CircularProgress = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  completedCount,
  totalCount,
  isArabic = true,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={percentage}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold text-foreground"
          >
            {Math.round(percentage)}%
          </motion.span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium">
        {bi("تقدم اليوم", "Today's Progress")}
      </p>
    </div>
  );
};
