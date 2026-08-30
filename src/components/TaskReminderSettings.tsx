import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dumbbell, Salad, Droplets, BookOpen, Moon, Bell } from "lucide-react";

interface TaskReminder {
  id?: string;
  task_id: number;
  reminder_time: string;
  is_enabled: boolean;
}

const tasksList = [
  { id: 1, title: "workout", icon: Dumbbell },
  { id: 2, title: "diet", icon: Salad },
  { id: 3, title: "water", icon: Droplets },
  { id: 4, title: "reading", icon: BookOpen },
  { id: 6, title: "eveningWorkout", icon: Moon },
];

export const TaskReminderSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
    fetchReminders();
  }, []);

  const checkNotificationPermission = async () => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setPermissionGranted(true);
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        setPermissionGranted(permission === "granted");
      }
    }
  };

  const fetchReminders = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("task_reminders")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Initialize with existing reminders or default values
      const initialReminders = tasksList.map(task => {
        const existing = data?.find(r => r.task_id === task.id);
        return {
          id: existing?.id,
          task_id: task.id,
          reminder_time: existing?.reminder_time || "09:00",
          is_enabled: existing?.is_enabled || false,
        };
      });

      setReminders(initialReminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleNotification = (taskTitle: string, time: string) => {
    if (!permissionGranted) return;

    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      new Notification("تذكير بالمهمة", {
        body: `حان وقت: ${taskTitle}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    }, timeUntilNotification);
  };

  const handleToggle = async (taskId: number) => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const reminder = reminders.find(r => r.task_id === taskId);
      if (!reminder) return;

      const newEnabled = !reminder.is_enabled;

      if (reminder.id) {
        // Update existing
        const { error } = await supabase
          .from("task_reminders")
          .update({ is_enabled: newEnabled })
          .eq("id", reminder.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("task_reminders")
          .insert({
            user_id: user.id,
            task_id: taskId,
            reminder_time: reminder.reminder_time,
            is_enabled: newEnabled,
          })
          .select()
          .single();

        if (error) throw error;

        setReminders(prev => prev.map(r => 
          r.task_id === taskId ? { ...r, id: data.id } : r
        ));
      }

      setReminders(prev => prev.map(r => 
        r.task_id === taskId ? { ...r, is_enabled: newEnabled } : r
      ));

      if (newEnabled && permissionGranted) {
        const task = tasksList.find(t => t.id === taskId);
        if (task) {
          scheduleNotification(t(`tasks.${task.title}.title`), reminder.reminder_time);
        }
      }

      toast({
        title: "تم الحفظ",
        description: "تم تحديث التذكير بنجاح",
      });
    } catch (error) {
      console.error("Error toggling reminder:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث التذكير",
        variant: "destructive",
      });
    }
  };

  const handleTimeChange = async (taskId: number, newTime: string) => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const reminder = reminders.find(r => r.task_id === taskId);
      if (!reminder) return;

      if (reminder.id) {
        const { error } = await supabase
          .from("task_reminders")
          .update({ reminder_time: newTime })
          .eq("id", reminder.id);

        if (error) throw error;
      }

      setReminders(prev => prev.map(r => 
        r.task_id === taskId ? { ...r, reminder_time: newTime } : r
      ));

      if (reminder.is_enabled && permissionGranted) {
        const task = tasksList.find(t => t.id === taskId);
        if (task) {
          scheduleNotification(t(`tasks.${task.title}.title`), newTime);
        }
      }
    } catch (error) {
      console.error("Error updating time:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === "granted");
      
      if (permission === "granted") {
        toast({
          title: "تم التفعيل",
          description: "تم تفعيل الإشعارات بنجاح",
        });
      } else {
        toast({
          title: "تم الرفض",
          description: "لم يتم منح إذن الإشعارات",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      {!permissionGranted && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">تفعيل إشعارات المتصفح</p>
                <p className="text-xs text-muted-foreground">
                  للحصول على تذكيرات المهام، يجب تفعيل إشعارات المتصفح
                </p>
                <Button 
                  size="sm" 
                  onClick={requestNotificationPermission}
                  className="mt-2"
                >
                  تفعيل الإشعارات
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tasksList.map(task => {
        const reminder = reminders.find(r => r.task_id === task.id);
        const Icon = task.icon;

        return (
          <Card key={task.id} className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <Label className="text-sm font-medium">
                    {t(`tasks.${task.title}.title`)}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(`tasks.${task.title}.description`)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    value={reminder?.reminder_time || "09:00"}
                    onChange={(e) => handleTimeChange(task.id, e.target.value)}
                    disabled={!reminder?.is_enabled}
                    className="w-28 h-9"
                  />
                  
                  <Switch
                    checked={reminder?.is_enabled || false}
                    onCheckedChange={() => handleToggle(task.id)}
                    disabled={!permissionGranted}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
