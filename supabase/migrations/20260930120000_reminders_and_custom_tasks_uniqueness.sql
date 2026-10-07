-- task_reminders: one reminder per (user, task); custom_tasks: no duplicate
-- active titles per user.

-- 1) task 6 no longer exists in the app.
DELETE FROM public.task_reminders WHERE task_id = 6;

-- 2) Keep the most recently touched row for each (user_id, task_id).
DELETE FROM public.task_reminders t
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, task_id
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.task_reminders
) d
WHERE t.id = d.id AND d.rn > 1;

ALTER TABLE public.task_reminders
  ADD CONSTRAINT task_reminders_user_task_key UNIQUE (user_id, task_id);

-- 3) custom_tasks is soft-deleted (is_active = false). Deactivate any older
--    active duplicates first so the index can be built, then forbid new ones.
UPDATE public.custom_tasks c
SET is_active = false
FROM (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, title
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.custom_tasks
  WHERE is_active
) d
WHERE c.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX custom_tasks_user_title_active_key
  ON public.custom_tasks (user_id, title)
  WHERE is_active;
