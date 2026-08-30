import { useState, useRef, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { Clock, StickyNote, Palette, Timer, Trash2, X } from "lucide-react";
import { DuoThickCheck } from "@/components/icons/DuolingoIcons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899"
];

interface DailyTaskProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  onToggle: () => void;
  reminderTime?: string;
  hasReminder?: boolean;
  onReminderClick?: () => void;
  tagName?: string;
  tagColor?: string;
  customColor?: string;
  note?: string;
  onNoteChange?: (note: string) => void;
  onColorChange?: (color: string) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  timerDuration?: number;
  onTimerStart?: () => void;
  isTimerActive?: boolean;
  remainingTime?: number;
}

export const DailyTask = ({
  title,
  description,
  icon,
  completed,
  onToggle,
  reminderTime,
  hasReminder,
  onReminderClick,
  tagName,
  tagColor = "#ef4444",
  customColor,
  note,
  onNoteChange,
  onColorChange,
  onDelete,
  canDelete = false,
  timerDuration,
  onTimerStart,
  isTimerActive,
  remainingTime
}: DailyTaskProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localNote, setLocalNote] = useState(note || "");

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const touchStartTime = useRef(0);
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);
  const LONG_PRESS_MS = 500;
  const MOVE_CANCEL_THRESHOLD = 10;

  const hasEditOptions = onNoteChange || onColorChange || canDelete;

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePressStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'mousedown' && 'ontouchstart' in window) {
      return;
    }

    didLongPress.current = false;
    touchStartTime.current = Date.now();
    if ('touches' in e && e.touches.length > 0) {
      touchStartPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else {
      touchStartPosition.current = null;
    }

    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setIsEditOpen(true);
    }, LONG_PRESS_MS);
  }, []);

  const handlePressEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'mouseup' && 'ontouchstart' in window) {
      return;
    }

    clearTimer();
    touchStartPosition.current = null;

    setTimeout(() => {
      didLongPress.current = false;
    }, 100);
  }, [clearTimer]);

  const handlePressCancel = useCallback(() => {
    clearTimer();
    didLongPress.current = false;
    touchStartPosition.current = null;
  }, [clearTimer]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosition.current || e.touches.length === 0) {
      return;
    }

    const deltaX = Math.abs(e.touches[0].clientX - touchStartPosition.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartPosition.current.y);

    if (deltaX > MOVE_CANCEL_THRESHOLD || deltaY > MOVE_CANCEL_THRESHOLD) {
      handlePressCancel();
    }
  }, [handlePressCancel]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (hasEditOptions) {
      e.preventDefault();
      setIsEditOpen(true);
    }
  }, [hasEditOptions]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  const handleNoteChange = (value: string) => {
    setLocalNote(value);
    onNoteChange?.(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "group relative rounded-2xl select-none touch-pan-y overflow-hidden",
          "border-2 border-b-[5px] transition-all duration-75",
          // Completions are final: no pointer/press feedback once checked.
          !completed && "cursor-pointer active:border-b-2 active:translate-y-[3px]",
          // duo tokens: surface + border + a darker bottom edge acting as the
          // ledge (kept as border-b so the existing press states still work)
          customColor
            ? "text-white"
            : completed
              ? "bg-[hsl(var(--duo-surface))] border-[#58cc02] border-b-[#46a302]"
              : "bg-[hsl(var(--duo-surface))] border-[hsl(var(--duo-border))] border-b-[hsl(var(--duo-edge))]"
        )}
        style={{
          backgroundColor: customColor || undefined,
          borderColor: customColor ? `color-mix(in srgb, ${customColor} 80%, black)` : undefined,
        }}
        onClick={() => { if (!completed) onToggle(); }}
        onTouchStart={hasEditOptions ? handlePressStart : undefined}
        onTouchMove={hasEditOptions ? handleTouchMove : undefined}
        onTouchEnd={hasEditOptions ? handlePressEnd : undefined}
        onTouchCancel={handlePressCancel}
        onMouseDown={hasEditOptions ? handlePressStart : undefined}
        onMouseUp={hasEditOptions ? handlePressEnd : undefined}
        onMouseLeave={handlePressCancel}
        onContextMenu={handleContextMenu}
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Large SVG Icon */}
            <div 
              className={cn(
                "flex-shrink-0 w-14 h-14 flex items-center justify-center transition-all duration-200",
                completed && "opacity-60 grayscale"
              )}
            >
              {icon}
            </div>

            {/* Title and metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={cn(
                  "text-base font-bold tracking-wide transition-colors",
                  customColor
                    ? completed ? "text-white/70 line-through" : "text-white"
                    : completed ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {title}
                </h3>
                {tagName && !customColor && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 rounded-full font-medium"
                    style={{ backgroundColor: `${tagColor}18`, color: tagColor }}
                  >
                    {tagName}
                  </Badge>
                )}
              </div>

              {isTimerActive && remainingTime !== undefined && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Timer className="w-3 h-3 text-orange-500 animate-pulse" />
                  <span className="text-xs font-mono font-semibold text-orange-500">
                    {formatTime(remainingTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Right-side indicators */}
            <div className="flex items-center gap-2">
              {localNote && (
                <StickyNote className={cn("w-3.5 h-3.5", customColor ? "text-white/70" : "text-muted-foreground")} />
              )}
              {hasReminder && (
                <Clock className={cn("w-3.5 h-3.5", customColor ? "text-white/70" : "text-primary")} />
              )}
              
              {/* Completion check — always visible: empty circle when incomplete,
                  filled green with a check when complete. Tapping the whole card toggles it. */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 border-2",
                  completed
                    ? customColor
                      ? "bg-white/30 border-white/40"
                      : "bg-[#58cc02] border-[#58cc02]"
                    : customColor
                      ? "border-white/50"
                      : "border-muted-foreground/30 group-hover:border-[#58cc02]"
                )}
              >
                <AnimatePresence mode="wait">
                  {completed && (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <DuoThickCheck className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                    customColor
                      ? "bg-white/20 hover:bg-white/30 text-white"
                      : "bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-center flex items-center justify-center gap-2">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={customColor ? { color: customColor, backgroundColor: `${customColor}15` } : undefined}
              >
                {icon}
              </span>
              {title}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 pb-6">
            {onNoteChange && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <StickyNote className="w-4 h-4" />
                  {bi("ملاحظة", "Note")}
                </label>
                <Textarea
                  value={localNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder={bi("أضف ملاحظة...", "Add a note...")}
                  className="min-h-[80px] text-sm resize-none rounded-xl"
                />
              </div>
            )}

            {/* Color Picker */}
            {onColorChange && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Palette className="w-4 h-4" />
                  {bi("اللون", "Color")}
                </label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onColorChange(color)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all duration-150 border-2",
                        customColor === color
                          ? "border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20"
                          : "border-transparent hover:scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => onColorChange("")}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-foreground transition-colors",
                      !customColor && "border-foreground"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Timer Button */}
            {timerDuration && onTimerStart && !isTimerActive && (
              <Button
                variant="outline"
                onClick={() => {
                  onTimerStart();
                  setIsEditOpen(false);
                }}
                className="w-full gap-2 text-orange-500 border-orange-200 hover:bg-orange-50"
              >
                <Timer className="w-4 h-4" />
                {isArabic ? `ابدأ المؤقت (${timerDuration} د)` : `Start Timer (${timerDuration}m)`}
              </Button>
            )}

            {/* Delete Button */}
            {canDelete && onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setIsEditOpen(false);
                }}
                className="w-full gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {bi("حذف المهمة", "Delete task")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bi("حذف المهمة؟", "Delete task?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? `هل أنت متأكد من حذف "${title}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${title}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {bi("إلغاء", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bi("نعم، احذف", "Yes, delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
