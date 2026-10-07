-- Apple in-app purchases for the iOS app. Android keeps selling through WAYL
-- (activate_premium / activate_lifetime / grant_coins, unchanged).
--
-- The App Store products, set up in App Store Connect:
--   com.hardchallenge.app.premium.monthly   auto-renewable subscription
--   com.hardchallenge.app.premium.lifetime  non-consumable
--   com.hardchallenge.app.gems.100 / .500 / .1000   consumables (points)
--
-- Every transaction arrives as a JWS signed by Apple. The Edge Functions
-- (apple-iap from the app, apple-iap-notify from Apple) verify that signature
-- and then call apple_apply_transaction — the only thing that grants anything.

------------------------------------------------------------------------------
-- Which account owns which Apple purchase.
-- Keyed by Apple's originalTransactionId: a subscription keeps it across
-- renewals, so renewals and refunds reported by Apple's server notifications
-- find their account here. First account to report a purchase owns it, so one
-- receipt can't unlock premium on several accounts.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apple_owners (
  original_transaction_id text PRIMARY KEY,
  user_id      text NOT NULL,
  product_id   text NOT NULL,
  expires_at   timestamptz,
  environment  text NOT NULL,           -- 'Production' | 'Sandbox' (App Review buys in Sandbox)
  revoked      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apple_owners_user_idx ON public.apple_owners (user_id);
ALTER TABLE public.apple_owners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.apple_owners FROM anon, authenticated;

------------------------------------------------------------------------------
-- Apply one verified transaction. Idempotent per transaction id (purchases'
-- unique (provider, provider_ref)), so the app and Apple's notification can
-- both report the same purchase safely.
--
-- Returns: 'granted' | 'duplicate' | 'revoked' | 'other_account' | 'unknown_product'
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apple_apply_transaction(
  p_user_id                 text,
  p_transaction_id          text,
  p_original_transaction_id text,
  p_product_id              text,
  p_expires_at              timestamptz,
  p_revoked                 boolean,
  p_environment             text,
  p_price                   text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c_monthly  constant text := 'com.hardchallenge.app.premium.monthly';
  c_lifetime constant text := 'com.hardchallenge.app.premium.lifetime';
  v_points   integer;
  v_kind     text;
  v_owner    text;
  v_inserted uuid;
BEGIN
  v_points := CASE p_product_id
    WHEN 'com.hardchallenge.app.gems.100'  THEN 100
    WHEN 'com.hardchallenge.app.gems.500'  THEN 500
    WHEN 'com.hardchallenge.app.gems.1000' THEN 1000
  END;
  v_kind := CASE
    WHEN p_product_id = c_monthly  THEN 'premium'
    WHEN p_product_id = c_lifetime THEN 'lifetime'
    WHEN v_points IS NOT NULL      THEN 'coins'
  END;
  IF v_kind IS NULL THEN
    RETURN 'unknown_product';
  END IF;

  -- Claim the purchase for this account, or find who already has it.
  INSERT INTO public.apple_owners (original_transaction_id, user_id, product_id, expires_at, environment)
  VALUES (p_original_transaction_id, p_user_id, p_product_id, p_expires_at, p_environment)
  ON CONFLICT (original_transaction_id) DO NOTHING;
  SELECT user_id INTO v_owner FROM public.apple_owners
   WHERE original_transaction_id = p_original_transaction_id;
  IF v_owner IS DISTINCT FROM p_user_id THEN
    RETURN 'other_account';
  END IF;

  -- Refunded / revoked: take back what this purchase gave.
  IF p_revoked THEN
    UPDATE public.apple_owners SET revoked = true, updated_at = now()
     WHERE original_transaction_id = p_original_transaction_id;

    IF v_kind = 'lifetime' THEN
      UPDATE public.profiles
         SET is_lifetime = false,
             is_premium  = COALESCE(premium_until > now(), false)
       WHERE id = p_user_id;
    ELSIF v_kind = 'premium' THEN
      -- Only the time Apple gave; WAYL time beyond it stays.
      UPDATE public.profiles
         SET premium_until = now()
       WHERE id = p_user_id
         AND NOT COALESCE(is_lifetime, false)
         AND premium_until IS NOT NULL
         AND premium_until <= COALESCE(p_expires_at, premium_until);
    ELSIF EXISTS (SELECT 1 FROM public.purchases
                   WHERE provider = 'apple' AND provider_ref = p_transaction_id
                     AND status = 'completed') THEN
      UPDATE public.challenge_progress
         SET total_points = GREATEST(0, total_points - v_points), updated_at = now()
       WHERE user_id = p_user_id;
    END IF;

    UPDATE public.purchases SET status = 'refunded'
     WHERE provider = 'apple' AND provider_ref = p_transaction_id;
    RETURN 'revoked';
  END IF;

  -- Record first; a repeat report of the same transaction stops here.
  INSERT INTO public.purchases (user_id, kind, provider, provider_ref, amount_paid, coins_granted)
  VALUES (p_user_id, v_kind, 'apple', p_transaction_id, p_price,
          CASE WHEN v_kind = 'coins' THEN v_points END)
  ON CONFLICT (provider, provider_ref) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_kind = 'premium' AND p_expires_at IS NOT NULL THEN
    -- Keep the newest expiry even for a repeat report (renewal info refresh).
    UPDATE public.apple_owners
       SET expires_at = GREATEST(COALESCE(expires_at, p_expires_at), p_expires_at), updated_at = now()
     WHERE original_transaction_id = p_original_transaction_id;
    UPDATE public.profiles
       SET is_premium    = true,
           premium_until = GREATEST(COALESCE(premium_until, now()), p_expires_at)
     WHERE id = p_user_id
       AND NOT COALESCE(is_lifetime, false);
  END IF;

  IF v_inserted IS NULL THEN
    RETURN 'duplicate';
  END IF;

  IF v_kind = 'lifetime' THEN
    UPDATE public.profiles
       SET is_premium = true, is_lifetime = true, premium_until = NULL
     WHERE id = p_user_id;
  ELSIF v_kind = 'coins' THEN
    -- Store balance only, not weekly_points, like WAYL packs (grant_coins).
    UPDATE public.challenge_progress
       SET total_points = total_points + v_points, updated_at = now()
     WHERE user_id = p_user_id;
  END IF;

  RETURN 'granted';
END;
$function$;

REVOKE ALL ON FUNCTION public.apple_apply_transaction(text, text, text, text, timestamptz, boolean, text, text)
  FROM PUBLIC, anon, authenticated;
