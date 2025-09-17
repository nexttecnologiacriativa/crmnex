
-- Criar tabela para armazenar conversas do WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para armazenar mensagens individuais
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, image, document, etc
  is_from_lead BOOLEAN NOT NULL DEFAULT true,
  sent_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para templates de mensagens rápidas
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS nas tabelas
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para conversas
CREATE POLICY "Users can view conversations in their workspace" 
  ON public.whatsapp_conversations 
  FOR SELECT 
  USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can create conversations in their workspace" 
  ON public.whatsapp_conversations 
  FOR INSERT 
  WITH CHECK (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can update conversations in their workspace" 
  ON public.whatsapp_conversations 
  FOR UPDATE 
  USING (user_belongs_to_workspace(workspace_id));

-- Políticas RLS para mensagens
CREATE POLICY "Users can view messages in their workspace conversations" 
  ON public.whatsapp_messages 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c 
    WHERE c.id = conversation_id 
    AND user_belongs_to_workspace(c.workspace_id)
  ));

CREATE POLICY "Users can create messages in their workspace conversations" 
  ON public.whatsapp_messages 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c 
    WHERE c.id = conversation_id 
    AND user_belongs_to_workspace(c.workspace_id)
  ));

-- Políticas RLS para templates
CREATE POLICY "Users can view templates in their workspace" 
  ON public.whatsapp_templates 
  FOR SELECT 
  USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can create templates in their workspace" 
  ON public.whatsapp_templates 
  FOR INSERT 
  WITH CHECK (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can update their own templates" 
  ON public.whatsapp_templates 
  FOR UPDATE 
  USING (created_by = auth.uid() AND user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can delete their own templates" 
  ON public.whatsapp_templates 
  FOR DELETE 
  USING (created_by = auth.uid() AND user_belongs_to_workspace(workspace_id));

-- Trigger para atualizar updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
