import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-client";

/**
 * Whether the user may use company mode right now.
 *
 * Company mode is a premium feature: the server's `has_company_access` returns
 * true only when the user has an active subscription AND is currently linked to
 * a company. Both halves matter — a lapsed subscriber keeps their company_code
 * but loses access, and `record_attendance` / `get_attendance_window` refuse
 * them with `premium_required` regardless of what the client believes.
 *
 * The answer is shared across the three company screens through react-query,
 * so switching between their tabs does not put a spinner in front of each one;
 * it is re-asked once it is older than the client's staleTime.
 */

export type CompanyAccessState = "checking" | "allowed" | "denied";

export async function fetchCompanyAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_company_access");
  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * @param optimistic The user is known (from this device) to be in company mode.
 *   The screen renders immediately while the server is asked in the background;
 *   only an explicit "no" denies. A failed request does not evict them — the
 *   database refuses anything they are not entitled to regardless.
 *   Without it the check fails closed, as before.
 */
export function useCompanyAccess(uid: string | null, optimistic = false) {
  const query = useQuery({
    queryKey: qk.companyAccess(uid),
    queryFn: fetchCompanyAccess,
    enabled: !!uid,
  });

  let state: CompanyAccessState;
  if (!uid) state = "denied"; // signed out — nothing to check
  else if (query.data === true) state = "allowed";
  else if (query.data === false) state = "denied";
  else if (query.isError) {
    if (!optimistic) console.warn("has_company_access failed; denying company mode:", query.error);
    state = optimistic ? "allowed" : "denied";
  } else state = optimistic ? "allowed" : "checking";

  return {
    state,
    /** True only when the server itself answered "no". */
    serverDenied: query.data === false,
    recheck: () => void query.refetch(),
  };
}
