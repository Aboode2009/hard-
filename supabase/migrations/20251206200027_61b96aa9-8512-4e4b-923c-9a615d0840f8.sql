-- Fix: Restrict user_roles SELECT to own roles only (prevents admin enumeration)
-- Note: The has_role() function uses SECURITY DEFINER so role checks will still work
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);