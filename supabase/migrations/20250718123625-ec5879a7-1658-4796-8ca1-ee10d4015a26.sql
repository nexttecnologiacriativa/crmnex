-- Criar trigger para automação quando novo lead é criado
CREATE OR REPLACE FUNCTION public.trigger_lead_created_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir na fila de processamento de automação
  INSERT INTO public.automation_queue (
    workspace_id,
    trigger_type,
    lead_id,
    trigger_data,
    created_at
  ) VALUES (
    NEW.workspace_id,
    'lead_created',
    NEW.id,
    jsonb_build_object(
      'lead_id', NEW.id,
      'lead_name', NEW.name,
      'lead_phone', NEW.phone,
      'lead_email', NEW.email
    ),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela para fila de automação se não existir
CREATE TABLE IF NOT EXISTS public.automation_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  trigger_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar trigger na tabela leads
DROP TRIGGER IF EXISTS lead_created_automation_trigger ON public.leads;
CREATE TRIGGER lead_created_automation_trigger
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_created_automation();

-- Habilitar RLS na tabela automation_queue
ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;

-- Política para ver filas do próprio workspace
CREATE POLICY "Users can view automation queue from their workspace" 
ON public.automation_queue 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = automation_queue.workspace_id 
    AND user_id = auth.uid()
  )
);

-- Política para inserir filas no próprio workspace
CREATE POLICY "Users can insert automation queue in their workspace" 
ON public.automation_queue 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = automation_queue.workspace_id 
    AND user_id = auth.uid()
  )
);

-- Política para atualizar filas do próprio workspace
CREATE POLICY "Users can update automation queue from their workspace" 
ON public.automation_queue 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = automation_queue.workspace_id 
    AND user_id = auth.uid()
  )
);