-- 1. Criar tabela de associação usuário ↔ instância
CREATE TABLE user_whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, instance_id)
);

-- 2. Habilitar RLS
ALTER TABLE user_whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- 3. Política: usuários veem suas próprias associações
CREATE POLICY "Users can see their instance associations"
ON user_whatsapp_instances FOR SELECT
USING (auth.uid() = user_id);

-- 4. Política: admins/managers podem gerenciar todas associações do workspace
CREATE POLICY "Admins can manage instance associations"
ON user_whatsapp_instances FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_instances wi
    JOIN workspace_members wm ON wm.workspace_id = wi.workspace_id
    WHERE wi.id = user_whatsapp_instances.instance_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'manager')
  )
);

-- 5. Adicionar coluna display_name para nome personalizado
ALTER TABLE whatsapp_instances 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 6. Associar instâncias ao usuário otavio.james@next.tec.br
INSERT INTO user_whatsapp_instances (user_id, instance_id)
SELECT 
  '37f9b6a8-9408-4ed4-8061-1dbd7506689a',
  id
FROM whatsapp_instances 
WHERE instance_name IN ('ws_e15cbf15_adriano-next', 'ws_e15cbf15_comercial')
ON CONFLICT (user_id, instance_id) DO NOTHING;