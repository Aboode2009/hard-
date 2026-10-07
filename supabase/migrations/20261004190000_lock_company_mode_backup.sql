-- _company_mode_backup (a one-off snapshot of company codes; the app never
-- reads it) sat in the public API with RLS off, so anyone holding the anon
-- key could read or rewrite it. RLS on with no policies closes it to clients;
-- the rows stay for the owner and service role.
ALTER TABLE public._company_mode_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._company_mode_backup FROM anon, authenticated;
