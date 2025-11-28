-- Criar tabela para configurações de notificações sonoras do usuário
CREATE TABLE user_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  whatsapp_sound_enabled BOOLEAN DEFAULT false,
  whatsapp_sound_type TEXT DEFAULT 'notification-1',
  lead_sound_enabled BOOLEAN DEFAULT false,
  lead_sound_type TEXT DEFAULT 'notification-1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- Habilitar RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem gerenciar suas próprias configurações
CREATE POLICY "Users can manage their own notification settings"
ON user_notification_settings FOR ALL 
USING (auth.uid() = user_id);