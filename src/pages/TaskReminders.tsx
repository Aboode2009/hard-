import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dumbbell, Salad, Droplets, BookOpen, Moon, Bell } from "lucide-react";
import { notificationService, TaskReminder } from "@/lib/notifications";

const tasksList = [
  { id: 1, title: "workout", icon: Dumbbell, color: "#FF4B4B" },
  { id: 2, title: "diet", icon: Salad, color: "#58CC02" },
  { id: 3, title: "water", icon: Droplets, color: "#1CB0F6" },
  { id: 4, title: "reading", icon: BookOpen, color: "#FFC800" },
  { id: 6, title: "eveningWorkout", icon: Moon, color: "#CE82FF" },
];

const TaskReminders = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkAuthAndPermission();
    fetchReminders();
  }, []);

  const checkAuthAndPermission = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: adminData } = await supabase.rpc('is_admin');
      if (adminData) {
        setIsAdmin(true);
      }

      // Check notification permission
      const hasPermission = await notificationService.checkPermission();
      setPermissionGranted(hasPermission);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
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
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const granted = await notificationService.requestPermission();
      setPermissionGranted(granted);
      
      if (granted) {
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
    } catch (error) {
      console.error("Error requesting permission:", error);
    }
  };

  const scheduleAllNotifications = async () => {
    try {
      const taskNames = tasksList.reduce((acc, task) => {
        acc[task.id] = t(`tasks.${task.title}.title`);
        return acc;
      }, {} as Record<number, string>);

      await notificationService.scheduleTaskReminders(reminders, taskNames);
    } catch (error) {
      console.error("Error scheduling notifications:", error);
    }
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

      const updatedReminders = reminders.map(r => 
        r.task_id === taskId ? { ...r, is_enabled: newEnabled } : r
      );
      setReminders(updatedReminders);

      // Reschedule all notifications
      await scheduleAllNotifications();

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

      const updatedReminders = reminders.map(r => 
        r.task_id === taskId ? { ...r, reminder_time: newTime } : r
      );
      setReminders(updatedReminders);

      // Reschedule all notifications
      await scheduleAllNotifications();

      toast({
        title: "تم التحديث",
        description: "تم تحديث وقت التذكير",
      });
    } catch (error) {
      console.error("Error updating time:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="duo-page min-h-screen bg-background pb-24">
      <Navbar isAdmin={isAdmin} showLogout={true} />

      <div className="max-w-2xl mx-auto p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{t('reminders.title')}</h1>
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
            {t('reminders.description')}
          </p>
        </div>

        {!permissionGranted && (
          <div className="duo-card p-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#1CB0F61e" }}
              >
                <Bell className="w-5 h-5" style={{ color: "#1CB0F6" }} strokeWidth={2.5} />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-bold" style={{ color: "hsl(var(--duo-text))" }}>تفعيل الإشعارات</p>
                <p className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                  للحصول على تذكيرات المهام، يجب تفعيل إشعارات التطبيق
                </p>
                <Button
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="mt-2 duo-press rounded-xl font-extrabold text-white"
                  style={{ background: "#1CB0F6", boxShadow: "0 3px 0 #0F8ED9" }}
                >
                  تفعيل الإشعارات
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {tasksList.map(task => {
            const reminder = reminders.find(r => r.task_id === task.id);
            const Icon = task.icon;

            return (
              <div key={task.id} className="duo-card p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${task.color}1e` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: task.color }} strokeWidth={2.5} />
                  </div>

                  <div className="flex-1">
                    <Label className="text-sm font-bold" style={{ color: "hsl(var(--duo-text))" }}>
                      {t(`tasks.${task.title}.title`)}
                    </Label>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                      {t(`tasks.${task.title}.description`)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Input
                      type="time"
                      value={reminder?.reminder_time || "09:00"}
                      onChange={(e) => handleTimeChange(task.id, e.target.value)}
                      disabled={!reminder?.is_enabled}
                      className="w-28 h-9 rounded-xl border-2 font-bold"
                    />

                    <Switch
                      checked={reminder?.is_enabled || false}
                      onCheckedChange={() => handleToggle(task.id)}
                      disabled={!permissionGranted}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskReminders;
