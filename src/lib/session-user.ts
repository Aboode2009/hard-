import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * The signed-in user's id, read synchronously.
 *
 * `supabase.auth.getSession()` is async even though it only reads local
 * storage, so anything that must decide before the first paint — which screen
 * to open, which per-user flag applies — cannot wait for it. supabase-js keeps
 * the session as JSON under `sb-<project-ref>-auth-token` (the default key the
 * client in integrations/supabase/client.ts uses), so it is read directly.
 *
 * Only an *identity hint* for picking local, per-user state. It proves nothing:
 * every read and write still goes through the real session and RLS.
 */
const STORAGE_KEY = (() => {
  try {
    const ref = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
})();

export function storedSessionUserId(): string | null {
  if (!STORAGE_KEY) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: unknown } } | null;
    const id = parsed?.user?.id;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in user's id as React state: the stored value on the first render
 * (no loading flash), then kept in step with sign-in / sign-out.
 */
export function useSessionUserId(): string | null {
  const [uid, setUid] = useState<string | null>(storedSessionUserId);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUid(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return uid;
}

/**
 * The current user's id without a network round trip.
 *
 * `supabase.auth.getUser()` asks the auth server every time it is called; the
 * pages only need the id to scope their queries, which the local session has.
 */
export async function currentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
