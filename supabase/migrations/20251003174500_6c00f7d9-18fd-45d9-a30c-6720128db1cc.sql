-- Migração para popular workspace demo@next.tech.br com 500 leads
-- Corrigido com valores corretos do enum lead_status

-- 1. Modificar trigger para lidar com auth.uid() NULL
CREATE OR REPLACE FUNCTION public.log_lead_tag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, metadata)
      VALUES (NEW.lead_id, auth.uid(), 'tag_added', 'Tag adicionada', 'Uma nova tag foi atribuída ao lead', jsonb_build_object('tag_id', NEW.tag_id, 'timestamp', now()));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, metadata)
      VALUES (OLD.lead_id, auth.uid(), 'tag_removed', 'Tag removida', 'Uma tag foi removida do lead', jsonb_build_object('tag_id', OLD.tag_id, 'timestamp', now()));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Criar tags de marketing
INSERT INTO public.lead_tags (workspace_id, name, color) VALUES
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Facebook Ads', '#1877F2'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Google Ads', '#4285F4'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Instagram Ads', '#E4405F'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'LinkedIn Ads', '#0A66C2'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Orgânico', '#10B981'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Email Marketing', '#F59E0B'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Indicação', '#8B5CF6')
ON CONFLICT DO NOTHING;

-- 3. Popular com 500 leads
DO $$
DECLARE
  w_id UUID := 'a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4';
  u_id UUID := 'bb125053-3192-496a-b79e-5048c06688dd';
  p_id UUID := '1974cde4-7c88-424d-952c-cca7a234cacc';
  stages UUID[] := ARRAY['12264e4d-3f82-4514-b74e-399bfbe68535','7e91759b-a4c9-4e17-81c8-7e45a47f6a8a','abe98658-8fac-456e-ae7b-9ae125df05ec','058a0fc8-30f4-4ecb-863e-be49bfb28f4f','4a8e5b63-4c76-46ed-b832-34a8661847cf','96e1d6f9-95da-4bed-9e98-9371e1ba5afd']::UUID[];
  nomes TEXT[] := ARRAY['João Silva','Maria Santos','Pedro Oliveira','Ana Costa','Lucas Alves','Julia Ferreira','Carlos Ribeiro','Fernanda Lima','Rafael Gomes','Patricia Martins','Bruno Carvalho','Camila Rocha','Diego Almeida','Beatriz Dias','Felipe Castro','Gabriela Mendes','Thiago Barbosa','Larissa Souza','Rodrigo Nunes','Juliana Araújo'];
  empresas TEXT[] := ARRAY['TechSolutions','DigitalHub','SmartBusiness','GlobalSystems','NextLevel','AlphaCorp','BetaSolutions','FutureSystems','GreenTech','BlueOcean','PrimeTech','AdvanceGroup','CyberHub','InnovaBR','ClearVision'];
  cargos TEXT[] := ARRAY['CEO','Diretor','Gerente de Marketing','Gerente Comercial','Coordenador','Analista','Especialista'];
  sources TEXT[] := ARRAY['Facebook Ads','Google Ads','Instagram Ads','LinkedIn Ads','Orgânico','Email Marketing','Indicação'];
  utm_src TEXT[] := ARRAY['facebook','instagram','google','linkedin','direct'];
  utm_med TEXT[] := ARRAY['cpc','social','organic','email','referral'];
  campaigns TEXT[] := ARRAY['conversao_q1_2025','awareness_produto','search_marca','retargeting','b2b_leads','newsletter','lancamento'];
  lead_id UUID;
  s_idx INT;
  stat TEXT;
BEGIN
  FOR i IN 1..500 LOOP
    lead_id := gen_random_uuid();
    s_idx := CASE WHEN i<=175 THEN 1 WHEN i<=300 THEN 2 WHEN i<=400 THEN 3 WHEN i<=450 THEN 4 WHEN i<=475 THEN 5 ELSE 6 END;
    stat := (ARRAY['new','contacted','qualified','proposal','negotiation','closed_won'])[CASE WHEN i<=175 THEN 1 WHEN i<=300 THEN 2 WHEN i<=400 THEN 3 WHEN i<=450 THEN 4 WHEN i<=475 THEN 5 ELSE 6 END];
    
    INSERT INTO public.leads (id,workspace_id,pipeline_id,stage_id,name,email,phone,company,position,value,status,source,notes,assigned_to,created_at,updated_at,utm_source,utm_medium,utm_campaign)
    VALUES (lead_id,w_id,p_id,stages[s_idx],nomes[1+floor(random()*20)::INT],'lead'||i||'@empresa.com.br','+5511'||LPAD((900000000+i)::TEXT,9,'0'),empresas[1+floor(random()*15)::INT],cargos[1+floor(random()*7)::INT],(1000+floor(random()*49000))::NUMERIC,stat::lead_status,sources[1+floor(random()*7)::INT],'Lead demo',u_id,NOW()-(random()*INTERVAL'90days'),NOW()-(random()*INTERVAL'80days'),utm_src[1+floor(random()*5)::INT],utm_med[1+floor(random()*5)::INT],campaigns[1+floor(random()*7)::INT]);
    
    INSERT INTO public.lead_pipeline_relations(lead_id,pipeline_id,stage_id,is_primary) VALUES(lead_id,p_id,stages[s_idx],true);
    
    INSERT INTO public.lead_tag_relations(lead_id,tag_id) SELECT lead_id,id FROM public.lead_tags WHERE workspace_id=w_id ORDER BY random() LIMIT 2 ON CONFLICT DO NOTHING;
  END LOOP;
END $$;