-- Create backups table to store backup metadata
CREATE TABLE public.backups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  backup_data jsonb NOT NULL,
  backup_type text NOT NULL DEFAULT 'full',
  file_size_bytes bigint,
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Only admins can view backups
CREATE POLICY "Only admins can view backups"
ON public.backups
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can create backups
CREATE POLICY "Only admins can create backups"
ON public.backups
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete backups
CREATE POLICY "Only admins can delete backups"
ON public.backups
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_cron and pg_net extensions for scheduled backups
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;