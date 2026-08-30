import { useEffect, useRef, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star, Trophy, User } from "lucide-react";
import { DuoThickCheck } from "@/components/icons/DuolingoIcons";
import { ChestIcon } from "@/components/nav-icons";
import { LevelSummaryModal } from "./LevelSummaryModal";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface NodeData {
  index: number;
  status: "completed" | "current" | "locked";
  x: number;
  y: number;
  starsEarned: number;
  xpEarned: number;
  isTreasureChest: boolean;
  isFinal: boolean;
}

interface ProgressionMapProps {
  totalDays: number;
  currentDay: number;
  completedDays: number[];
  avatarUrl?: string | null;
  pathId: string;
}

const GREEN = "#58CC02";
const GREEN_EDGE = "#45A302";
const GOLD = "#FFC800";
const GOLD_EDGE = "#E6A700";

/**
 * Duolingo-style progression path: a clean vertical snake of chunky 3D
 * circular nodes (no connecting line, like the modern Duolingo path).
 * Completed nodes are green with a thick check, the current node has a
 * pulsing ring + bouncing START bubble, locked nodes are gray, every 5th
 * node is a treasure chest, and the final node is a trophy.
 */
export const ProgressionMap = ({
  totalDays,
  currentDay,
  completedDays,
  avatarUrl,
  pathId,
}: ProgressionMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [selectedLevel, setSelectedLevel] = useState<NodeData | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Map dimensions
  const mapWidth = 340;
  const nodeSpacing = 104;
  const padding = 80;
  const mapHeight = totalDays * nodeSpacing + padding * 2;

  const nodes = useMemo<NodeData[]>(() => {
    const result: NodeData[] = [];
    const amplitude = 88;

    for (let i = 0; i < totalDays; i++) {
      // Bottom-to-top snake
      const y = mapHeight - padding - i * nodeSpacing;
      const phase = (i / 3) * Math.PI; // one full swing every 6 nodes
      const x = mapWidth / 2 + Math.sin(phase) * amplitude;

      let status: "completed" | "current" | "locked";
      if (completedDays.includes(i + 1)) {
        status = "completed";
      } else if (i + 1 === currentDay) {
        status = "current";
      } else {
        status = "locked";
      }

      // Deterministic (no Math.random — keeps renders stable)
      const starsEarned = status === "completed" ? (i % 3) + 1 : 0;
      const xpEarned = status === "completed" ? 50 + (i % 4) * 25 : 0;

      result.push({
        index: i,
        status,
        x,
        y,
        starsEarned,
        xpEarned,
        isTreasureChest: (i + 1) % 5 === 0 && i + 1 !== totalDays,
        isFinal: i + 1 === totalDays,
      });
    }

    return result;
  }, [totalDays, currentDay, completedDays, mapHeight]);

  // The winding road connecting the nodes (gray base + green completed part)
  const { fullPath, completedPath } = useMemo(() => {
    if (nodes.length === 0) return { fullPath: "", completedPath: "" };

    const segment = (from: NodeData, to: NodeData) => {
      const cpX = (from.x + to.x) / 2;
      const cpY = (from.y + to.y) / 2;
      return ` Q ${from.x} ${(from.y + cpY) / 2}, ${cpX} ${cpY} Q ${to.x} ${(cpY + to.y) / 2}, ${to.x} ${to.y}`;
    };

    let pathD = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 1; i < nodes.length; i++) {
      pathD += segment(nodes[i - 1], nodes[i]);
    }

    // Completed road runs from the start up to the current node
    const currentIndex = nodes.findIndex((n) => n.status === "current");
    const lastReached = currentIndex === -1 ? nodes.length - 1 : currentIndex;
    let completedD = "";
    if (lastReached > 0) {
      completedD = `M ${nodes[0].x} ${nodes[0].y}`;
      for (let i = 1; i <= lastReached; i++) {
        completedD += segment(nodes[i - 1], nodes[i]);
      }
    }

    return { fullPath: pathD, completedPath: completedD };
  }, [nodes]);

  // Auto-scroll to current node
  useEffect(() => {
    if (containerRef.current) {
      const currentNode = nodes.find((n) => n.status === "current") || nodes[nodes.length - 1];
      if (currentNode) {
        const scrollY = currentNode.y - window.innerHeight / 2.5;
        setTimeout(() => {
          containerRef.current?.scrollTo({ top: Math.max(0, scrollY), behavior: "smooth" });
        }, 400);
      }
    }
  }, [nodes]);

  const handleNodeClick = (node: NodeData) => {
    if (node.status === "current") {
      haptic("light");
      navigate(`/path/${pathId}`);
    } else if (node.status === "completed") {
      setSelectedLevel(node);
      setShowSummary(true);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-[calc(100vh-190px)] overflow-auto bg-background"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="relative mx-auto" style={{ width: mapWidth, height: mapHeight }}>
          {/* Winding road behind the nodes */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={mapWidth}
            height={mapHeight}
          >
            <path
              d={fullPath}
              fill="none"
              stroke="hsl(var(--duo-border))"
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {completedPath && (
              <path
                d={completedPath}
                fill="none"
                stroke={GREEN}
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            )}
          </svg>

          {nodes.map((node) => {
            const locked = node.status === "locked";
            const isCurrent = node.status === "current";
            const completed = node.status === "completed";

            // Treasure chest node (sits directly on the path, no circle)
            if (node.isTreasureChest) {
              return (
                <motion.button
                  key={node.index}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(node.index * 0.03, 0.6), type: "spring", stiffness: 260, damping: 20 }}
                  onClick={() => handleNodeClick(node)}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2",
                    locked ? "grayscale opacity-50 cursor-default" : "cursor-pointer"
                  )}
                  style={{ left: node.x, top: node.y }}
                >
                  <ChestIcon className="w-16 h-16" />
                </motion.button>
              );
            }

            // Node colors
            const bg = node.isFinal
              ? (completed || isCurrent ? GOLD : undefined)
              : (completed || isCurrent ? GREEN : undefined);
            const edge = node.isFinal
              ? (completed || isCurrent ? GOLD_EDGE : undefined)
              : (completed || isCurrent ? GREEN_EDGE : undefined);

            return (
              <motion.div
                key={node.index}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(node.index * 0.03, 0.6), type: "spring", stiffness: 260, damping: 20 }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: node.x, top: node.y }}
              >
                {/* Your position marker — avatar floating above the current node */}
                {isCurrent && (
                  <motion.div
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[52px] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none"
                  >
                    <div
                      className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center border-[3px] border-white shadow-lg"
                      style={{ background: GREEN }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white" strokeWidth={2.5} />
                      )}
                    </div>
                    {/* Pointer tip */}
                    <div
                      className="w-0 h-0 -mt-[2px]"
                      style={{
                        borderLeft: "7px solid transparent",
                        borderRight: "7px solid transparent",
                        borderTop: "9px solid #fff",
                      }}
                    />
                  </motion.div>
                )}

                {/* Ring around the current node */}
                <div
                  className={cn("rounded-full", isCurrent && "p-[5px]")}
                  style={isCurrent ? { border: `4px solid ${node.isFinal ? GOLD : GREEN}40` } : undefined}
                >
                  <motion.button
                    onClick={() => handleNodeClick(node)}
                    whileTap={!locked ? { y: 5 } : undefined}
                    className={cn(
                      "w-[70px] h-[62px] rounded-full flex items-center justify-center",
                      locked ? "cursor-default" : "cursor-pointer"
                    )}
                    style={{
                      background: bg || "hsl(var(--duo-border))",
                      boxShadow: `0 7px 0 ${edge || "hsl(var(--duo-edge))"}`,
                    }}
                  >
                    {node.isFinal ? (
                      <Trophy
                        className="w-8 h-8"
                        style={{ color: completed || isCurrent ? "#fff" : "hsl(var(--duo-muted))" }}
                        strokeWidth={2.5}
                      />
                    ) : completed ? (
                      <DuoThickCheck className="w-8 h-8 text-white" />
                    ) : (
                      <Star
                        className="w-8 h-8"
                        style={{
                          color: isCurrent ? "#fff" : "hsl(var(--duo-muted))",
                          fill: isCurrent ? "#fff" : "hsl(var(--duo-muted))",
                        }}
                      />
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary Modal */}
      {selectedLevel && (
        <LevelSummaryModal
          open={showSummary}
          onClose={() => setShowSummary(false)}
          dayNumber={selectedLevel.index + 1}
          xpEarned={selectedLevel.xpEarned}
          starsEarned={selectedLevel.starsEarned}
          grade={
            selectedLevel.starsEarned === 3
              ? "A+"
              : selectedLevel.starsEarned === 2
              ? "B"
              : "C"
          }
        />
      )}
    </>
  );
};
