-- Update get_users_with_roles to mask email addresses for privacy
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
 RETURNS TABLE(id uuid, username text, email text, created_at timestamp with time zone, role text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.username,
    CASE 
      WHEN au.email IS NULL THEN 'N/A'
      ELSE CONCAT(LEFT(au.email, 3), '***@', SPLIT_PART(au.email, '@', 2))
    END as email,
    p.created_at,
    ur.role::text
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC;
$function$;