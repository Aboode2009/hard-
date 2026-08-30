// This file wires Supabase to Clerk using Supabase's native third-party auth.
// Clerk mints the session token; Supabase verifies it via Clerk's JWKS and
// exposes the Clerk user id to RLS as `auth.jwt() ->> 'sub'`.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Surfaces a clear message instead of a cryptic createClient failure
  // (mirrors the Clerk key check in main.tsx). See .env.example.
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them to your .env file.",
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  // With `accessToken` set, Supabase pulls the bearer token from Clerk on every
  // request. Do NOT also configure the `auth` block — the two are mutually
  // exclusive, and session handling now lives entirely in Clerk.
  accessToken: async () => {
    const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
    try {
      return (await clerk?.session?.getToken()) ?? null;
    } catch {
      return null;
    }
  },
});
