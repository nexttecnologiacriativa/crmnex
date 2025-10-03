-- Migration: Normalizar mídia do WhatsApp para bucket único
-- Bucket: e15cbf15-2758-4af5-a1af-8fd3a641b778
-- Estrutura: audio/ e images/

-- 1. Atualizar media_type baseado na extensão do arquivo
UPDATE whatsapp_messages
SET media_type = CASE
  WHEN media_url LIKE '%.ogg%' OR media_url LIKE '%.mp3%' OR media_url LIKE '%.m4a%' OR media_url LIKE '%.wav%' THEN 'audio'
  WHEN media_url LIKE '%.jpg%' OR media_url LIKE '%.jpeg%' OR media_url LIKE '%.png%' OR media_url LIKE '%.gif%' OR media_url LIKE '%.webp%' THEN 'image'
  WHEN media_url LIKE '%.pdf%' OR media_url LIKE '%.doc%' OR media_url LIKE '%.docx%' THEN 'document'
  ELSE media_type
END
WHERE media_url IS NOT NULL AND media_type IS NULL;

-- 2. Atualizar attachment_name baseado na URL
UPDATE whatsapp_messages
SET attachment_name = CASE
  WHEN media_type = 'audio' THEN 'audio_' || to_char(created_at, 'YYYYMMDD_HH24MISS') || COALESCE(substring(media_url from '\.(ogg|mp3|m4a|wav)$'), '.ogg')
  WHEN media_type = 'image' THEN 'image_' || to_char(created_at, 'YYYYMMDD_HH24MISS') || COALESCE(substring(media_url from '\.(jpg|jpeg|png|gif|webp)$'), '.jpg')
  WHEN media_type = 'document' THEN 'document_' || to_char(created_at, 'YYYYMMDD_HH24MISS') || COALESCE(substring(media_url from '\.(pdf|doc|docx)$'), '.pdf')
  ELSE attachment_name
END
WHERE media_url IS NOT NULL AND attachment_name IS NULL;

-- 3. Atualizar URLs de buckets antigos para o bucket correto (primeiro match genérico)
UPDATE whatsapp_messages
SET media_url = regexp_replace(
  media_url,
  '/storage/v1/object/public/[^/]+/',
  '/storage/v1/object/public/e15cbf15-2758-4af5-a1af-8fd3a641b778/',
  'g'
)
WHERE media_url IS NOT NULL 
  AND media_url LIKE '%/storage/v1/object/public/%'
  AND media_url NOT LIKE '%e15cbf15-2758-4af5-a1af-8fd3a641b778%';

-- 4. Normalizar paths dentro do bucket correto (áudio → audio/, imagem → images/)
UPDATE whatsapp_messages
SET media_url = CASE
  WHEN media_type = 'audio' THEN 
    regexp_replace(media_url, 'e15cbf15-2758-4af5-a1af-8fd3a641b778/[^/]+/', 'e15cbf15-2758-4af5-a1af-8fd3a641b778/audio/', 'g')
  WHEN media_type = 'image' THEN 
    regexp_replace(media_url, 'e15cbf15-2758-4af5-a1af-8fd3a641b778/[^/]+/', 'e15cbf15-2758-4af5-a1af-8fd3a641b778/images/', 'g')
  ELSE media_url
END
WHERE media_url IS NOT NULL 
  AND media_url LIKE '%e15cbf15-2758-4af5-a1af-8fd3a641b778%'
  AND (
    (media_type = 'audio' AND media_url NOT LIKE '%/audio/%') OR
    (media_type = 'image' AND media_url NOT LIKE '%/images/%')
  );