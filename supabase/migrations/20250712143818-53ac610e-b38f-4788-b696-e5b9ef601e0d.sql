-- Criar bucket de áudios para WhatsApp com configuração correta
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audios', 'audios', true)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  name = 'audios';

-- Políticas de acesso público total para o bucket audios
CREATE POLICY "Acesso público total para leitura" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audios');

CREATE POLICY "Usuários autenticados podem fazer upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audios' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audios' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audios' AND auth.uid() IS NOT NULL);