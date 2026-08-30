import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

export interface TaskReminder {
  id: string;
  task_id: number;
  reminder_time: string;
  is_enabled: boolean;
}

// ID reserved for end-of-day reminder
const END_OF_DAY_REMINDER_ID = 9999;
const MOTIVATIONAL_REMINDER_ID = 8888;
const URGENT_REMINDER_1_ID = 7777; // 11 PM reminder
const URGENT_REMINDER_2_ID = 7778; // 11:30 PM reminder
const URGENT_REMINDER_3_ID = 7779; // 11:45 PM reminder

// Motivational quotes
const motivationalQuotesAr = [
  "كل يوم هو فرصة جديدة للتغيير 💪",
  "النجاح ليس وجهة، بل رحلة مستمرة 🚀",
  "أنت أقوى مما تظن! استمر 🔥",
  "الانضباط هو الجسر بين الأهداف والإنجاز 🌟",
  "اليوم أفضل من الأمس، وغداً أفضل من اليوم ⭐",
  "لا تستسلم، أنت أقرب للهدف مما تتخيل 🎯",
  "التغيير يبدأ بخطوة واحدة 👣",
  "اجعل كل يوم تحفة فنية 🎨",
];

const motivationalQuotesEn = [
  "Every day is a new opportunity for change 💪",
  "Success is not a destination, it's a journey 🚀",
  "You are stronger than you think! Keep going 🔥",
  "Discipline is the bridge between goals and achievement 🌟",
  "Today is better than yesterday, tomorrow better than today ⭐",
  "Don't give up, you're closer to your goal than you imagine 🎯",
  "Change begins with a single step 👣",
  "Make every day a masterpiece 🎨",
];

export const notificationService = {
  async requestPermission() {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  },

  async checkPermission() {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  },

  async scheduleTaskReminders(reminders: TaskReminder[], taskNames: Record<number, string>) {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('لم يتم منح إذن الإشعارات');
      }
    }

    // Cancel all existing notifications except reserved ones
    const pendingNotifications = await LocalNotifications.getPending();
    const reservedIds = [END_OF_DAY_REMINDER_ID, MOTIVATIONAL_REMINDER_ID, URGENT_REMINDER_1_ID, URGENT_REMINDER_2_ID, URGENT_REMINDER_3_ID];
    const taskNotificationIds = pendingNotifications.notifications
      .filter(n => !reservedIds.includes(n.id))
      .map(n => ({ id: n.id }));
    
    if (taskNotificationIds.length > 0) {
      await LocalNotifications.cancel({ notifications: taskNotificationIds });
    }

    // Schedule new notifications
    const notifications = reminders
      .filter(reminder => reminder.is_enabled)
      .map((reminder, index) => {
        const [hours, minutes] = reminder.reminder_time.split(':');
        const now = new Date();
        const scheduledTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(hours),
          parseInt(minutes)
        );

        // If time has passed today, schedule for tomorrow
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        return {
          id: index + 1,
          title: 'تذكير المهمة',
          body: `حان وقت: ${taskNames[reminder.task_id]}`,
          schedule: {
            at: scheduledTime,
            every: 'day' as const
          },
          smallIcon: 'ic_stat_icon_config_sample',
          sound: 'beep.wav',
          actionTypeId: '',
          extra: {
            taskId: reminder.task_id
          }
        };
      });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({
        notifications
      });
    }
  },

  async scheduleEndOfDayReminder(isArabic: boolean = true) {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        return false;
      }
    }

    // Cancel existing end-of-day reminder
    try {
      await LocalNotifications.cancel({ 
        notifications: [{ id: END_OF_DAY_REMINDER_ID }] 
      });
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Schedule reminder at 10 PM (22:00) - 2 hours before midnight
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      22, // 10 PM
      0
    );

    // If 10 PM has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const title = isArabic ? '⚠️ تنبيه - باقي ساعتين!' : '⚠️ Warning - 2 hours left!';
    const body = isArabic 
      ? 'لم تكمل مهامك اليوم بعد! أكمل المهام قبل نهاية اليوم لتجنب إعادة التحدي من البداية.'
      : "You haven't completed today's tasks yet! Complete them before midnight to avoid resetting the challenge.";

    await LocalNotifications.schedule({
      notifications: [{
        id: END_OF_DAY_REMINDER_ID,
        title,
        body,
        schedule: {
          at: scheduledTime,
          every: 'day' as const
        },
        smallIcon: 'ic_stat_icon_config_sample',
        sound: 'beep.wav',
        actionTypeId: '',
        extra: {
          type: 'end_of_day_reminder'
        }
      }]
    });

    return true;
  },

  // Schedule multiple urgent reminders when little time is left
  async scheduleUrgentReminders(isArabic: boolean = true) {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        return false;
      }
    }

    const now = new Date();
    
    // Cancel existing urgent reminders
    try {
      await LocalNotifications.cancel({ 
        notifications: [
          { id: URGENT_REMINDER_1_ID },
          { id: URGENT_REMINDER_2_ID },
          { id: URGENT_REMINDER_3_ID }
        ] 
      });
    } catch (e) {
      // Ignore
    }

    const urgentReminders = [
      {
        id: URGENT_REMINDER_1_ID,
        hour: 23,
        minute: 0,
        title: isArabic ? '🚨 تحذير عاجل!' : '🚨 Urgent Warning!',
        body: isArabic 
          ? 'باقي ساعة واحدة فقط! أسرع وأكمل مهامك قبل فوات الأوان!'
          : 'Only 1 hour left! Hurry and complete your tasks before it\'s too late!'
      },
      {
        id: URGENT_REMINDER_2_ID,
        hour: 23,
        minute: 30,
        title: isArabic ? '⏰ الوقت ينفد!' : '⏰ Time is running out!',
        body: isArabic 
          ? 'باقي 30 دقيقة فقط! لا تخسر تقدمك، أكمل المهام الآن!'
          : 'Only 30 minutes left! Don\'t lose your progress, complete tasks now!'
      },
      {
        id: URGENT_REMINDER_3_ID,
        hour: 23,
        minute: 45,
        title: isArabic ? '🔥 آخر فرصة!' : '🔥 Last chance!',
        body: isArabic 
          ? 'باقي 15 دقيقة! هذه فرصتك الأخيرة لإنقاذ يومك!'
          : '15 minutes left! This is your last chance to save your day!'
      }
    ];

    const notifications = urgentReminders.map(reminder => {
      const scheduledTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        reminder.hour,
        reminder.minute
      );

      // If time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      return {
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        schedule: {
          at: scheduledTime,
          every: 'day' as const
        },
        smallIcon: 'ic_stat_icon_config_sample',
        sound: 'beep.wav',
        actionTypeId: '',
        extra: {
          type: 'urgent_reminder'
        }
      };
    });

    await LocalNotifications.schedule({ notifications });

    return true;
  },

  async cancelUrgentReminders() {
    try {
      await LocalNotifications.cancel({ 
        notifications: [
          { id: URGENT_REMINDER_1_ID },
          { id: URGENT_REMINDER_2_ID },
          { id: URGENT_REMINDER_3_ID }
        ] 
      });
    } catch (e) {
      // Ignore if doesn't exist
    }
  },

  async cancelEndOfDayReminder() {
    try {
      await LocalNotifications.cancel({ 
        notifications: [{ id: END_OF_DAY_REMINDER_ID }] 
      });
    } catch (e) {
      // Ignore if doesn't exist
    }
  },

  async cancelAll() {
    await LocalNotifications.cancel({ notifications: [] });
  },

  async scheduleMotivationalReminder(isArabic: boolean = true, enabled: boolean = true) {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        return false;
      }
    }

    // Cancel existing motivational reminder
    try {
      await LocalNotifications.cancel({ 
        notifications: [{ id: MOTIVATIONAL_REMINDER_ID }] 
      });
    } catch (e) {
      // Ignore if doesn't exist
    }

    if (!enabled) return true;

    // Schedule motivational reminder at random time between 9 AM - 6 PM
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      14, // 2 PM
      0
    );

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Pick random quote
    const quotes = isArabic ? motivationalQuotesAr : motivationalQuotesEn;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    const title = isArabic ? '✨ رسالة تحفيزية' : '✨ Motivational Message';

    await LocalNotifications.schedule({
      notifications: [{
        id: MOTIVATIONAL_REMINDER_ID,
        title,
        body: randomQuote,
        schedule: {
          at: scheduledTime,
          every: 'day' as const
        },
        smallIcon: 'ic_stat_icon_config_sample',
        sound: 'beep.wav',
        actionTypeId: '',
        extra: {
          type: 'motivational_reminder'
        }
      }]
    });

    return true;
  },

  async cancelMotivationalReminder() {
    try {
      await LocalNotifications.cancel({ 
        notifications: [{ id: MOTIVATIONAL_REMINDER_ID }] 
      });
    } catch (e) {
      // Ignore if doesn't exist
    }
  },

  async scheduleStreakCelebration(streak: number, isArabic: boolean = true) {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) return;

    // Only celebrate at milestones
    const milestones = [7, 14, 21, 30, 45, 60, 75, 90, 100];
    if (!milestones.includes(streak)) return;

    const title = isArabic ? '🎉 احتفال!' : '🎉 Celebration!';
    const body = isArabic 
      ? `مبروك! وصلت لسلسلة ${streak} يوم متتالي! استمر!`
      : `Congratulations! You've reached a ${streak} day streak! Keep it up!`;

    // Immediate notification
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 1000) + 1000, // Random ID for one-time notification
        title,
        body,
        schedule: {
          at: new Date(Date.now() + 1000) // 1 second from now
        },
        smallIcon: 'ic_stat_icon_config_sample',
        sound: 'beep.wav',
        actionTypeId: '',
        extra: {
          type: 'streak_celebration',
          streak
        }
      }]
    });
  },

  // Schedule all task-related reminders
  async scheduleAllTaskReminders(allTasksCompleted: boolean, isArabic: boolean = true) {
    try {
      if (allTasksCompleted) {
        // Cancel all reminders if tasks completed
        await this.cancelEndOfDayReminder();
        await this.cancelUrgentReminders();
      } else {
        // Schedule end-of-day and urgent reminders
        await this.scheduleEndOfDayReminder(isArabic);
        await this.scheduleUrgentReminders(isArabic);
      }
    } catch (error) {
      console.log('Notification not available:', error);
    }
  }
};
