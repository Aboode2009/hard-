import { motion } from "framer-motion";

interface PathSVGProps {
  pathData: string;
  completedPathData: string;
  width: number;
  height: number;
}

export const PathSVG = ({
  pathData,
  completedPathData,
  width,
  height,
}: PathSVGProps) => {
  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Gradient for locked path */}
        <linearGradient id="lockedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--muted))" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground) / 0.3)" />
        </linearGradient>

        {/* Gradient for completed path */}
        <linearGradient id="completedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background/Locked path - dashed */}
      <motion.path
        d={pathData}
        fill="none"
        stroke="url(#lockedGradient)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="20 10"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      {/* Completed path - solid with glow */}
      {completedPathData && (
        <motion.path
          d={completedPathData}
          fill="none"
          stroke="url(#completedGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        />
      )}
    </svg>
  );
};
