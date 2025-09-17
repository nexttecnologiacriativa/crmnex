-- Corrigir funções com search_path mutable para segurança
-- As funções precisam ter SET search_path = 'public' para evitar vulnerabilidades

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.setup_default_workspace_data(p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  pipeline_id uuid;
  stage_ids uuid[];
  board_id uuid;
BEGIN
  -- Criar pipeline padrão
  INSERT INTO public.pipelines (workspace_id, name, description, is_default)
  VALUES (p_workspace_id, 'Pipeline de Vendas', 'Pipeline padrão para gestão de leads', true)
  RETURNING id INTO pipeline_id;

  -- Criar estágios do pipeline
  WITH stages AS (
    INSERT INTO public.pipeline_stages (pipeline_id, name, color, position)
    VALUES 
      (pipeline_id, 'Novo Lead', '#3b82f6', 0),
      (pipeline_id, 'Contato Inicial', '#8b5cf6', 1),
      (pipeline_id, 'Qualificado', '#06b6d4', 2),
      (pipeline_id, 'Proposta', '#f59e0b', 3),
      (pipeline_id, 'Negociação', '#ef4444', 4),
      (pipeline_id, 'Fechado', '#10b981', 5)
    RETURNING id
  )
  SELECT array_agg(id) FROM stages INTO stage_ids;

  -- Criar job board padrão
  INSERT INTO public.job_boards (workspace_id, name, description, color, is_default)
  VALUES (p_workspace_id, 'Board Padrão', 'Board padrão para jobs', '#3b82f6', false)
  RETURNING id INTO board_id;

  -- Criar configurações do workspace
  INSERT INTO public.workspace_settings (workspace_id, default_pipeline_id)
  VALUES (p_workspace_id, pipeline_id)
  ON CONFLICT (workspace_id) DO UPDATE SET default_pipeline_id = pipeline_id;

  -- Criar configurações de marketing padrão
  INSERT INTO public.marketing_settings (workspace_id, default_api_type, evolution_message_interval, max_messages_per_minute)
  VALUES (p_workspace_id, 'whatsapp_official', 2, 30)
  ON CONFLICT (workspace_id) DO NOTHING;

  -- Criar configurações de debriefing padrão
  INSERT INTO public.debriefing_settings (workspace_id, fixed_cost, tax_percentage)
  VALUES (p_workspace_id, 0, 0)
  ON CONFLICT DO NOTHING;

  -- Criar status da conta
  INSERT INTO public.account_status (workspace_id, is_active)
  VALUES (p_workspace_id, true)
  ON CONFLICT (workspace_id) DO NOTHING;

  -- Criar tags padrão
  INSERT INTO public.lead_tags (workspace_id, name, color)
  VALUES 
    (p_workspace_id, 'Quente', '#ef4444'),
    (p_workspace_id, 'Morno', '#f59e0b'),
    (p_workspace_id, 'Frio', '#06b6d4'),
    (p_workspace_id, 'Qualificado', '#10b981'),
    (p_workspace_id, 'Interessado', '#8b5cf6')
  ON CONFLICT DO NOTHING;

END;
$function$;