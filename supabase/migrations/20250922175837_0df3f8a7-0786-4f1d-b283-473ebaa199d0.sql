-- Corrigir avisos de segurança
-- 1. Corrigir search_path da função debug_auth_context
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'auth_uid', auth.uid()::text,
    'auth_jwt', auth.jwt(),
    'current_timestamp', now()
  );
END;
$$;