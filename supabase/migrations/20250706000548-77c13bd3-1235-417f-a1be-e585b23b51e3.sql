-- Permitir status customizados na tabela jobs
ALTER TABLE public.jobs ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.jobs ALTER COLUMN status TYPE text;
ALTER TABLE public.jobs ALTER COLUMN status SET DEFAULT 'todo'::text;

-- Criar bucket para áudios do WhatsApp
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-audio', 'whatsapp-audio', true);

-- Políticas para o bucket de áudio
CREATE POLICY "Áudios do WhatsApp são acessíveis por membros do workspace"
ON storage.objects
FOR SELECT
USING (bucket_id = 'whatsapp-audio' AND (storage.foldername(name))[1] IN (
  SELECT workspace_id::text FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Usuários podem fazer upload de áudios no workspace"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-audio' AND (storage.foldername(name))[1] IN (
  SELECT workspace_id::text FROM workspace_members WHERE user_id = auth.uid()
));

-- Adicionar coluna para URL permanente do áudio
ALTER TABLE public.whatsapp_messages 
ADD COLUMN permanent_audio_url text;