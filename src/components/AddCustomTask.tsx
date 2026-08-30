import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Palette, Clock, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface LifeAreaTag {
  id: string;
  name: string;
  name_ar: string;
  icon: string;
  color: string;
}

interface AddCustomTaskProps {
  onTaskAdded?: () => void;
  stageLevel?: number;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
];

export const AddCustomTask = ({ onTaskAdded, stageLevel = 1 }: AddCustomTaskProps) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<LifeAreaTag[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("#3b82f6");
  const [timerDuration, setTimerDuration] = useState<string>("");
  const [reminderTime, setReminderTime] = useState<string>("");

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase
      .from('life_area_tags')
      .select('*');
    
    if (data) setTags(data);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: t('customTask.titleRequired'),
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { session } } = await clerkAuth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('custom_tasks')
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          description: description.trim() || null,
          tag_id: selectedTag || null,
        });

      if (error) throw error;

      // If reminder time is set, create a reminder
      if (reminderTime) {
        // Get the task ID we just created
        const { data: newTask } = await supabase
          .from('custom_tasks')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('title', title.trim())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (newTask) {
          // Store reminder in localStorage for custom tasks (numbered 100+)
          const customReminders = JSON.parse(localStorage.getItem(`custom_reminders_${session.user.id}`) || '{}');
          customReminders[newTask.id] = {
            time: reminderTime,
            timerDuration: timerDuration ? parseInt(timerDuration) : null,
            color: selectedColor,
          };
          localStorage.setItem(`custom_reminders_${session.user.id}`, JSON.stringify(customReminders));
        }
      }

      toast({
        title: t('customTask.added'),
        description: t('customTask.addedDescription'),
      });

      // Reset form
      setTitle("");
      setDescription("");
      setSelectedTag("");
      setSelectedColor("#3b82f6");
      setTimerDuration("");
      setReminderTime("");
      setOpen(false);
      onTaskAdded?.();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        variant: "destructive",
        title: t('index.error'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full h-12 gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-5 h-5" />
        {t('customTask.addButton')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('customTask.title')}</DialogTitle>
            <DialogDescription>
              {t('customTask.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="taskTitle">{t('customTask.taskName')}</Label>
              <Input
                id="taskTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('customTask.taskNamePlaceholder')}
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="taskDescription">{t('customTask.taskDescription')}</Label>
              <Textarea
                id="taskDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('customTask.taskDescriptionPlaceholder')}
                className="min-h-[80px]"
              />
            </div>

            {/* Category/Tag Selection */}
            <div className="space-y-2">
              <Label>{t('customTask.category')}</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder={t('customTask.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {isArabic ? tag.name_ar : tag.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {bi("لون المهمة", "Task Color")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all duration-200 border-2",
                      selectedColor === color 
                        ? "scale-110 border-foreground shadow-lg" 
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  {bi("أو اختر لوناً مخصصاً:", "Or choose custom:")}
                </span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Timer Duration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                {bi("مدة المؤقت (بالدقائق)", "Timer Duration (minutes)")}
              </Label>
              <Input
                type="number"
                value={timerDuration}
                onChange={(e) => setTimerDuration(e.target.value)}
                placeholder={bi("مثال: 30", "e.g., 30")}
                min="1"
                max="180"
              />
              <p className="text-xs text-muted-foreground">
                {bi("اختياري - أضف مؤقتاً للمهمة", "Optional - Add a timer for this task")}
              </p>
            </div>

            {/* Reminder Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {bi("وقت التذكير", "Reminder Time")}
              </Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {bi("اختياري - سيتم تذكيرك في هذا الوقت", "Optional - You'll be reminded at this time")}
              </p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>{bi("معاينة", "Preview")}</Label>
              <div 
                className="p-3 rounded-lg border-2 border-l-4"
                style={{ borderLeftColor: selectedColor }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <span className="font-medium text-sm">
                    {title || (bi("اسم المهمة", "Task Name"))}
                  </span>
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? t('profile.saving') : t('customTask.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
