-- População de 500 leads realistas para demo@next.tech.br
-- Workspace: a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4

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
      VALUES (NEW.lead_id, auth.uid(), 'tag_added', 'Tag adicionada', 'Uma nova tag foi atribuída ao lead',
        jsonb_build_object('tag_id', NEW.tag_id, 'timestamp', now()));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, metadata)
      VALUES (OLD.lead_id, auth.uid(), 'tag_removed', 'Tag removida', 'Uma tag foi removida do lead',
        jsonb_build_object('tag_id', OLD.tag_id, 'timestamp', now()));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Criar tags de origem
INSERT INTO public.lead_tags (workspace_id, name, color) VALUES
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Facebook Ads', '#1877F2'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Google Ads', '#4285F4'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Instagram Ads', '#E4405F'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'LinkedIn Ads', '#0A66C2'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Orgânico', '#10B981'),
('a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4', 'Email Marketing', '#F59E0B')
ON CONFLICT DO NOTHING;

-- 3. Função auxiliar
CREATE OR REPLACE FUNCTION random_between(low INT, high INT) RETURNS INT AS $$
BEGIN RETURN floor(random() * (high - low + 1) + low); END;
$$ LANGUAGE plpgsql;

-- 4. Popular 500 leads
DO $$
DECLARE
  w_id UUID := 'a8eb2830-1e7b-4d2d-bd0d-1201c0b4f3c4';
  u_id UUID := 'bb125053-3192-496a-b79e-5048c06688dd';
  p_id UUID := '1974cde4-7c88-424d-952c-cca7a234cacc';
  stages UUID[] := ARRAY['12264e4d-3f82-4514-b74e-399bfbe68535'::UUID,'7e91759b-a4c9-4e17-81c8-7e45a47f6a8a'::UUID,'abe98658-8fac-456e-ae7b-9ae125df05ec'::UUID,'058a0fc8-30f4-4ecb-863e-be49bfb28f4f'::UUID,'4a8e5b63-4c76-46ed-b832-34a8661847cf'::UUID,'96e1d6f9-95da-4bed-9e98-9371e1ba5afd'::UUID];
  nomes TEXT[] := ARRAY['João Silva','Maria Santos','Pedro Oliveira','Ana Costa','Lucas Alves','Julia Ferreira','Carlos Ribeiro','Fernanda Lima','Rafael Gomes','Patricia Martins','Bruno Souza','Camila Rodrigues','Diego Fernandes','Beatriz Almeida','Thiago Castro'];
  empresas TEXT[] := ARRAY['TechSolutions','DigitalHub','SmartBusiness','GlobalSystems','NextLevel','AlphaCorp','BetaSolutions','FutureSystems','CyberTech','GreenTech'];
  cargos TEXT[] := ARRAY['CEO','Diretor','Gerente','Coordenador','Analista','Supervisor'];
  sources TEXT[] := ARRAY['Facebook Ads','Google Ads','Instagram Ads','LinkedIn Ads','Orgânico','Email Marketing'];
  utms TEXT[] := ARRAY['facebook','instagram','google','linkedin','newsletter'];
  meds TEXT[] := ARRAY['cpc','social','organic','email','search'];
  camps TEXT[] := ARRAY['conversao_q1_2025','awareness_produto','search_marca','b2b_leads','newsletter','retargeting','lancamento'];
  lead UUID; stage_idx INT; i INT;
BEGIN
  FOR i IN 1..500 LOOP
    lead := gen_random_uuid();
    stage_idx := CASE WHEN i<=175 THEN 1 WHEN i<=300 THEN 2 WHEN i<=400 THEN 3 WHEN i<=450 THEN 4 WHEN i<=475 THEN 5 ELSE 6 END;
    
    INSERT INTO public.leads (id,workspace_id,pipeline_id,stage_id,name,email,phone,company,position,value,status,source,notes,assigned_to,created_at,updated_at,utm_source,utm_medium,utm_campaign)
    VALUES (lead,w_id,p_id,stages[stage_idx],nomes[random_between(1,15)],'lead'||i||'@empresa.com.br','+5511'||LPAD((900000000+i)::TEXT,9,'0'),empresas[random_between(1,10)],cargos[random_between(1,6)],random_between(1000,50000)::NUMERIC,(ARRAY['new','contacted','qualified','proposal','negotiation','closed_won'])[random_between(1,6)]::lead_status,sources[random_between(1,6)],'Lead gerado automaticamente',u_id,NOW()-(random()*INTERVAL'90 days'),NOW()-(random()*INTERVAL'80 days'),utms[random_between(1,5)],meds[random_between(1,5)],camps[random_between(1,7)]);
    
    INSERT INTO public.lead_pipeline_relations (lead_id,pipeline_id,stage_id,is_primary) VALUES (lead,p_id,stages[stage_idx],true);
    
    INSERT INTO public.lead_tag_relations (lead_id,tag_id) SELECT lead,id FROM public.lead_tags WHERE workspace_id=w_id ORDER BY random() LIMIT 2 ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS random_between(INT,INT);