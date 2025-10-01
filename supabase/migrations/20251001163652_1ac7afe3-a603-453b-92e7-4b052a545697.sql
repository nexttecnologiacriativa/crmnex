-- Corrigir função para ter search_path seguro
DROP FUNCTION IF EXISTS normalize_phone_number(TEXT);

CREATE OR REPLACE FUNCTION normalize_phone_number(phone TEXT) 
RETURNS TEXT 
LANGUAGE plpgsql 
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Remove sufixos após : (ex: :57)
  phone := REGEXP_REPLACE(phone, ':[0-9]+$', '');
  
  -- Remove @s.whatsapp.net se existir
  phone := REPLACE(phone, '@s.whatsapp.net', '');
  
  -- Remove @g.us se existir (grupos)
  phone := REPLACE(phone, '@g.us', '');
  
  -- Remove todos os caracteres não numéricos
  phone := REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
  
  RETURN phone;
END;
$$;