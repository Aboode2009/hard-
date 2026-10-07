/**
 * Typed wrappers around the server-side challenge economy.
 *
 * Points, streaks, days, freezes, XP, loot boxes and inventory are computed
 * and written only by SECURITY DEFINER functions in the database (see
 * supabase/migrations/20260930120100_server_side_challenge_economy.sql).
 * The client says what happened; the server decides what it is worth.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChallengeMode = "main" | "nass";

export interface XPResult {
  new_xp: number;
  new_level: number;
  leveled_up: boolean;
}

/** The progress row as every challenge RPC returns it. */
export interface ChallengeState {
  current_day: number;
  stage_level: number | null;
  stage_days: number;
  start_date: string;
  current_streak: number;
  best_streak: number;
  completed_days: number[];
  tasks_state: Record<string, Record<string, boolean>>;
  today_tasks: Record<string, boolean>;
  total_points: number;
  weekly_points: number;
  streak_freezes: number;
}

export interface EvaluateResult extends ChallengeState {
  freezes_used: number;
  was_reset: boolean;
}

export interface CompleteTaskResult extends ChallengeState {
  awarded: boolean;
  points: number;
  xp: XPResult | null;
  loot_box_awarded?: boolean;
}

export interface CompleteDayResult extends ChallengeState {
  already_completed: boolean;
  completed_day?: number;
  day_points?: number;
  stage_bonus?: number;
  stage_advanced?: boolean;
  all_stages_completed?: boolean;
  xp?: XPResult | null;
  loot_box_awarded?: boolean;
}

type CosmeticRow = Database["public"]["Tables"]["cosmetic_items"]["Row"];

export interface OpenChestResult {
  coins: number;
  item: CosmeticRow | null;
  total_points: number;
}

export interface OpenLootBoxResult {
  item: CosmeticRow;
  duplicate: boolean;
  loot_boxes: number;
}

export interface LevelUpClaimResult {
  claimed: boolean;
  reason?: "already_claimed" | "no_items";
  item?: CosmeticRow;
  bonus_points?: number;
  level?: number;
}

export interface WeeklyBossChestResult {
  lemons: number;
  xp: number;
  xp_result: XPResult | null;
  cosmetic: { name: string; name_ar: string; type: string } | null;
}

type Fns = Database["public"]["Functions"];

/** Calls an RPC that returns jsonb and hands back its payload typed. */
async function call<T, K extends keyof Fns>(fn: K, args?: Fns[K]["Args"]): Promise<T> {
  // supabase.rpc is typed per function; the generic K keeps the call site honest.
  const { data, error } = await supabase.rpc(fn, args as never);
  if (error) throw new ChallengeRpcError(error.message);
  return data as unknown as T;
}

/** An RPC refused the request; `code` is the server's reason, e.g. `insufficient_points`. */
export class ChallengeRpcError extends Error {
  readonly code: string;
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}

export const challengeRpc = {
  evaluate: (mode: ChallengeMode) =>
    call<EvaluateResult, "evaluate_missed_days">("evaluate_missed_days", { p_mode: mode }),
  completeTask: (taskId: number, mode: ChallengeMode) =>
    call<CompleteTaskResult, "complete_task">("complete_task", { p_task_id: taskId, p_mode: mode }),
  completeCustomTask: (taskId: string, mode: ChallengeMode) =>
    call<CompleteTaskResult, "complete_custom_task">("complete_custom_task", { p_task_id: taskId, p_mode: mode }),
  completeDay: (mode: ChallengeMode) =>
    call<CompleteDayResult, "complete_day">("complete_day", { p_mode: mode }),
  buyStreakFreeze: () =>
    call<{ total_points: number; streak_freezes: number }, "buy_streak_freeze">("buy_streak_freeze"),
  openChest: () => call<OpenChestResult, "open_chest">("open_chest"),
  openLootBox: () => call<OpenLootBoxResult, "open_loot_box">("open_loot_box"),
  claimLevelUpReward: (level: number) =>
    call<LevelUpClaimResult, "claim_level_up_reward">("claim_level_up_reward", { p_level: level }),
  claimWeeklyBossChest: () =>
    call<WeeklyBossChestResult, "claim_weekly_boss_chest">("claim_weekly_boss_chest"),
  applyWeeklyBossPenalty: () =>
    call<{ penalty: number }, "apply_weekly_boss_penalty">("apply_weekly_boss_penalty"),
  buyTheme: (themeId: string) =>
    call<{ total_points: number }, "buy_theme">("buy_theme", { p_theme_id: themeId }),
  redeemNassReward: (rewardId: string) =>
    call<{ total_points: number }, "redeem_nass_reward">("redeem_nass_reward", { p_reward_id: rewardId }),
};

/** Human text for the server's refusal codes (Arabic first, English second). */
export function rpcErrorText(err: unknown): [ar: string, en: string] {
  const code = err instanceof ChallengeRpcError ? err.code : "";
  switch (code) {
    case "insufficient_points":
      return ["نقاطك غير كافية", "Not enough points"];
    case "max_freezes":
      return ["وصلت للحد الأقصى من دروع التجميد", "You already hold the maximum number of freezes"];
    case "tasks_incomplete":
      return ["أكمل كل المهام أولاً", "Complete all tasks first"];
    case "attendance_not_recorded":
      return ["سجّل حضورك أولاً", "Check in first"];
    case "company_access_required":
      return ["وضع الشركة للمشتركين فقط", "Company mode is for subscribers"];
    case "premium_required":
      return ["هذه الميزة للمشتركين فقط", "This feature is for subscribers"];
    case "no_loot_boxes":
      return ["لا توجد صناديق لفتحها", "No loot boxes to open"];
    case "no_items":
      return ["لا توجد عناصر متاحة حالياً", "No items available right now"];
    case "already_owned":
      return ["تملك هذا العنصر مسبقاً", "You already own this"];
    default:
      return ["حدث خطأ، حاول مرة أخرى", "Something went wrong, please try again"];
  }
}
