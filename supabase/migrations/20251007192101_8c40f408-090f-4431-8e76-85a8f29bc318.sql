-- Remover políticas antigas específicas de buckets (se existirem)
DROP POLICY IF EXISTS "Public read access for whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their workspace files" ON storage.objects;

-- Criar políticas genéricas para TODOS os buckets
-- Política de leitura pública para todos os buckets
CREATE POLICY "allow_public_read_all_buckets"
ON storage.objects
FOR SELECT
TO public
USING (true);

-- Política de upload para usuários autenticados em todos os buckets
CREATE POLICY "allow_authenticated_upload_all_buckets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política de upload público (necessário para edge functions sem auth)
CREATE POLICY "allow_service_upload_all_buckets"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (true);

-- Política de atualização para usuários autenticados
CREATE POLICY "allow_authenticated_update_all_buckets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política de delete para usuários autenticados
CREATE POLICY "allow_authenticated_delete_all_buckets"
ON storage.objects
FOR DELETE
TO authenticated
USING (true);