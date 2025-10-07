-- Criar enum para status de agendamento
CREATE TYPE appointment_status AS ENUM ('aguardando', 'compareceu', 'nao_qualificado', 'reagendado', 'falhou');

-- Criar tabela de agendamentos
CREATE TABLE public.lead_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'aguardando',
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lead_appointments ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários podem acessar agendamentos através do workspace
CREATE POLICY "Users can access appointments in their workspace"
ON public.lead_appointments
FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lead_appointments_updated_at
BEFORE UPDATE ON public.lead_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para registrar mudanças de status em atividades
CREATE OR REPLACE FUNCTION public.log_appointment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  executing_user_id UUID;
  status_label TEXT;
BEGIN
  -- Apenas em UPDATE de status
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    executing_user_id := auth.uid();
    
    IF executing_user_id IS NULL THEN
      executing_user_id := NEW.created_by;
    END IF;
    
    -- Definir label do status
    CASE NEW.status
      WHEN 'aguardando' THEN status_label := 'Aguardando';
      WHEN 'compareceu' THEN status_label := 'Compareceu';
      WHEN 'nao_qualificado' THEN status_label := 'Não Qualificado';
      WHEN 'reagendado' THEN status_label := 'Reagendado';
      WHEN 'falhou' THEN status_label := 'Faltou';
    END CASE;
    
    INSERT INTO public.lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.lead_id,
      executing_user_id,
      'appointment_status_change',
      'Status do agendamento alterado',
      'Agendamento "' || NEW.title || '" marcado como: ' || status_label,
      jsonb_build_object(
        'appointment_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'scheduled_date', NEW.scheduled_date,
        'scheduled_time', NEW.scheduled_time,
        'notes', NEW.notes,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para log de status
CREATE TRIGGER log_appointment_status_change
AFTER UPDATE ON public.lead_appointments
FOR EACH ROW
EXECUTE FUNCTION public.log_appointment_status_change();

-- Função para registrar criação de agendamento
CREATE OR REPLACE FUNCTION public.log_appointment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lead_activities (
    lead_id,
    user_id,
    activity_type,
    title,
    description,
    metadata
  ) VALUES (
    NEW.lead_id,
    NEW.created_by,
    'appointment_created',
    'Agendamento criado',
    'Reunião "' || NEW.title || '" agendada para ' || 
    to_char(NEW.scheduled_date, 'DD/MM/YYYY') || ' às ' || 
    to_char(NEW.scheduled_time, 'HH24:MI'),
    jsonb_build_object(
      'appointment_id', NEW.id,
      'scheduled_date', NEW.scheduled_date,
      'scheduled_time', NEW.scheduled_time,
      'timestamp', now()
    )
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para log de criação
CREATE TRIGGER log_appointment_creation
AFTER INSERT ON public.lead_appointments
FOR EACH ROW
EXECUTE FUNCTION public.log_appointment_creation();

-- Função para estatísticas de agendamentos
CREATE OR REPLACE FUNCTION public.get_appointment_stats(p_workspace_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  start_filter DATE;
  end_filter DATE;
BEGIN
  -- Definir período padrão (mês atual)
  start_filter := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
  end_filter := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::DATE);
  
  SELECT json_build_object(
    'total', COUNT(*),
    'aguardando', COUNT(*) FILTER (WHERE status = 'aguardando'),
    'compareceu', COUNT(*) FILTER (WHERE status = 'compareceu'),
    'nao_qualificado', COUNT(*) FILTER (WHERE status = 'nao_qualificado'),
    'reagendado', COUNT(*) FILTER (WHERE status = 'reagendado'),
    'falhou', COUNT(*) FILTER (WHERE status = 'falhou'),
    'taxa_comparecimento', 
      CASE 
        WHEN COUNT(*) FILTER (WHERE status IN ('compareceu', 'nao_qualificado', 'falhou')) > 0 
        THEN ROUND(
          (COUNT(*) FILTER (WHERE status = 'compareceu')::numeric / 
           COUNT(*) FILTER (WHERE status IN ('compareceu', 'nao_qualificado', 'falhou'))::numeric) * 100, 
          2
        )
        ELSE 0
      END
  ) INTO result
  FROM public.lead_appointments
  WHERE workspace_id = p_workspace_id
    AND scheduled_date BETWEEN start_filter AND end_filter;
  
  RETURN result;
END;
$$;