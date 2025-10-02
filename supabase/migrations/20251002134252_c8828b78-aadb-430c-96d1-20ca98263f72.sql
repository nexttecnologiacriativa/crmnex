-- Limpar TODAS as políticas existentes do bucket whatsapp-media
DROP POLICY IF EXISTS "Allow public access to whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can access whatsapp media in their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can upload to whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can update whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can delete from whatsapp-media" ON storage.objects;

-- Garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Criar política de LEITURA PÚBLICA (sem autenticação necessária)
CREATE POLICY "whatsapp_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Criar política de UPLOAD para usuários autenticados
CREATE POLICY "whatsapp_media_authenticated_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' 
  AND auth.uid() IS NOT NULL
);

-- Criar política de UPDATE para usuários autenticados
CREATE POLICY "whatsapp_media_authenticated_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'whatsapp-media' 
  AND auth.uid() IS NOT NULL
);

-- Criar política de DELETE para usuários autenticados
CREATE POLICY "whatsapp_media_authenticated_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media' 
  AND auth.uid() IS NOT NULL
);