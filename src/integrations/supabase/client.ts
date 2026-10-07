import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Surfaces a clear message instead of a cryptic createClient failure.
  // See .env.example.
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them to your .env file.",
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

/**
 * Supabase owns authentication outright: this client stores the session,
 * refreshes it, and attaches it to every request, and `auth.uid()` is what the
 * RLS policies read. There is deliberately no custom `accessToken` option --
 * it is mutually exclusive with Supabase's own session handling.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Needed on the web, where OAuth and the email links (confirmation, password
    // reset) return to this origin with the code in the URL. On native nothing
    // navigates the WebView, so the deep-link handler does the exchange instead
    // and this simply never fires.
    detectSessionInUrl: true,
  },
});
