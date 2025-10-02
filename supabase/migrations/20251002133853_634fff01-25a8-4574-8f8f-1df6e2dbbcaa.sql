-- Criar bucket whatsapp-media se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas existentes e recriar
DROP POLICY IF EXISTS "Public read access for whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete whatsapp media" ON storage.objects;

-- Política para permitir leitura pública de todos os arquivos
CREATE POLICY "Public read access for whatsapp media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Política para permitir upload por usuários autenticados
CREATE POLICY "Authenticated users can upload whatsapp media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir update por usuários autenticados
CREATE POLICY "Authenticated users can update whatsapp media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'whatsapp-media' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir delete por usuários autenticados
CREATE POLICY "Authenticated users can delete whatsapp media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media' 
  AND auth.uid() IS NOT NULL
);