// Clerk-backed compatibility layer that mirrors the parts of `supabase.auth`
// the app relied on (getUser / getSession / signOut / onAuthStateChange).
//
// The rest of the codebase keeps its existing shape, e.g.
//   const { data: { user } } = await clerkAuth.getUser();
//   const { data: { session } } = await clerkAuth.getSession();
// so identity now comes from Clerk while all data still comes from Supabase.
//
// Clerk exposes a global singleton on `window.Clerk` once <ClerkProvider> loads.

type ClerkGlobal = {
  loaded?: boolean;
  load?: () => Promise<void>;
  user?: {
    id: string;
    primaryEmailAddress?: { emailAddress?: string } | null;
    username?: string | null;
    fullName?: string | null;
  } | null;
  session?: { getToken: (opts?: unknown) => Promise<string | null> } | null;
  signOut?: () => Promise<void>;
  addListener?: (cb: (payload: unknown) => void) => () => void;
};

const getClerk = (): ClerkGlobal | undefined =>
  (typeof window !== "undefined" ? (window as unknown as { Clerk?: ClerkGlobal }).Clerk : undefined);

// Wait until Clerk has finished loading so imperative calls made early
// (e.g. inside a useEffect on first paint) don't see a null user.
const ensureLoaded = async (): Promise<ClerkGlobal | undefined> => {
  let clerk = getClerk();
  for (let i = 0; i < 50 && !clerk; i++) {
    await new Promise((r) => setTimeout(r, 100));
    clerk = getClerk();
  }
  if (clerk && !clerk.loaded && clerk.load) {
    try {
      await clerk.load();
    } catch {
      /* already loading */
    }
  }
  return clerk;
};

const mapUser = (u: NonNullable<ClerkGlobal["user"]>) => ({
  id: u.id,
  email: u.primaryEmailAddress?.emailAddress ?? null,
  user_metadata: {
    username: u.username ?? u.fullName ?? null,
  },
});

export type CompatUser = ReturnType<typeof mapUser> | null;
export type CompatSession =
  | { access_token?: string | null; user: NonNullable<CompatUser> }
  | null;

export const clerkAuth = {
  async getUser() {
    const clerk = await ensureLoaded();
    const u = clerk?.user ?? null;
    return { data: { user: u ? mapUser(u) : null }, error: null };
  },

  async getSession() {
    const clerk = await ensureLoaded();
    if (!clerk?.session || !clerk.user) {
      return { data: { session: null }, error: null };
    }
    let access_token: string | null = null;
    try {
      access_token = await clerk.session.getToken();
    } catch {
      access_token = null;
    }
    return {
      data: { session: { access_token, user: mapUser(clerk.user) } },
      error: null,
    };
  },

  async signOut() {
    const clerk = getClerk();
    try {
      await clerk?.signOut?.();
    } catch {
      /* noop */
    }
    return { error: null };
  },

  // Mirrors supabase.auth.onAuthStateChange's return shape.
  onAuthStateChange(
    callback: (event: string, session: { user: CompatUser } | null) => void
  ) {
    const emit = () => {
      const c = getClerk();
      if (c?.user) {
        callback("SIGNED_IN", { user: mapUser(c.user) });
      } else {
        callback("SIGNED_OUT", null);
      }
    };

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    // Wait for Clerk before the first emit. Reading it synchronously used to
    // report SIGNED_OUT on a cold start (Clerk loads over the network, which is
    // slow in the native WebView), which bounced signed-in users to /auth — and
    // because `addListener` didn't exist yet, no subscription was ever created
    // to correct it once Clerk finished loading.
    void ensureLoaded().then((clerk) => {
      if (cancelled) return;
      emit();
      unsubscribe = clerk?.addListener?.(() => emit());
    });

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            cancelled = true;
            try {
              unsubscribe?.();
            } catch {
              /* noop */
            }
          },
        },
      },
    };
  },
};

// Convenience helpers for new code.
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await clerkAuth.getUser();
  return data.user?.id ?? null;
};
