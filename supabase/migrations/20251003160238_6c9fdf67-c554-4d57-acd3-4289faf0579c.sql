-- Garantir que o bucket whatsapp-media seja público e tenha políticas corretas
UPDATE storage.buckets 
SET public = true 
WHERE id = 'whatsapp-media';

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their workspace folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view whatsapp media" ON storage.objects;

-- Criar política para acesso público de LEITURA
CREATE POLICY "Public read access to whatsapp-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Criar política para UPLOAD autenticado
CREATE POLICY "Authenticated upload to whatsapp-media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' 
  AND auth.role() = 'authenticated'
);

-- Criar política para UPDATE autenticado
CREATE POLICY "Authenticated update to whatsapp-media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'whatsapp-media' 
  AND auth.role() = 'authenticated'
);

-- Criar política para DELETE autenticado
CREATE POLICY "Authenticated delete from whatsapp-media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media' 
  AND auth.role() = 'authenticated'
);