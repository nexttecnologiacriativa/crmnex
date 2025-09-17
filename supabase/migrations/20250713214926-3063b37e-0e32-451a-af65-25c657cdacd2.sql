-- Tornar o bucket whatsapp-audio completamente público para leitura
-- Isso resolverá problemas de permissão no AudioPlayer

-- Primeiro, remover políticas restritivas existentes se houver
DROP POLICY IF EXISTS "Authenticated users can read audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read audio files" ON storage.objects;

-- Criar política de leitura pública para o bucket whatsapp-audio
CREATE POLICY "Public read access for whatsapp-audio bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'whatsapp-audio');

-- Manter controle de upload para usuários autenticados
CREATE POLICY "Authenticated users can upload to whatsapp-audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'whatsapp-audio' AND auth.uid() IS NOT NULL);

-- Política para deletar apenas próprios arquivos
CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'whatsapp-audio' AND auth.uid() IS NOT NULL);