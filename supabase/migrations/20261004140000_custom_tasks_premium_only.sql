-- Adding tasks is a Premium feature — both the ready-made habits and the
-- user's own custom tasks (both live in public.custom_tasks).
--
-- The app hides the add-task screens from free users, but RLS only checked
-- that the row was the user's own, so the API still accepted an insert from
-- anyone signed in. This trigger is the real gate:
--   * a new task (INSERT), and
--   * bringing a deleted one back (UPDATE is_active false → true — the
--     ready-made habits list restores a removed habit rather than inserting)
-- both require an active subscription. Editing or deleting tasks the user
-- already has is untouched, and so are tasks created before this change.
--
-- Only requests made as a signed-in user are checked (auth.uid() is set);
-- server-side jobs and the dashboard are not.

CREATE OR REPLACE FUNCTION public.custom_tasks_require_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.is_active
     OR TG_OP = 'UPDATE' AND NEW.is_active AND NOT OLD.is_active THEN
    IF NOT public.is_premium_active(NEW.user_id) THEN
      RAISE EXCEPTION 'premium_required'
        USING ERRCODE = '42501',
              HINT = 'Adding tasks requires an active Premium subscription.';
    END IF;
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.custom_tasks_require_premium() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS custom_tasks_require_premium ON public.custom_tasks;
CREATE TRIGGER custom_tasks_require_premium
  BEFORE INSERT OR UPDATE OF is_active ON public.custom_tasks
  FOR EACH ROW EXECUTE FUNCTION public.custom_tasks_require_premium();
