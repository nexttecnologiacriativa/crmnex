-- Criar tabela para debriefings estratégicos
CREATE TABLE IF NOT EXISTS public.debriefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Informações gerais
  project_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- 'semente', 'interno', 'desafio', 'perpetuo', 'campanha', 'outro'
  start_date DATE,
  end_date DATE,
  responsible TEXT,
  
  -- Aba 1 - Análise Qualitativa
  what_happened TEXT,
  what_worked TEXT,
  what_could_improve TEXT,
  next_steps TEXT,
  
  -- Aba 2 - Dados da Campanha
  total_investment DECIMAL(15,2),
  gross_revenue DECIMAL(15,2),
  net_revenue DECIMAL(15,2),
  leads_captured INTEGER,
  sales_made INTEGER,
  
  -- Aba 3 - Dados da Página
  page_url TEXT,
  total_views INTEGER,
  unique_visitors INTEGER,
  cta_clicks INTEGER,
  conversions INTEGER,
  avg_time_on_page INTEGER, -- em segundos
  predominant_device TEXT,
  predominant_traffic_source TEXT,
  
  -- Aba 4 - Dados do Checkout
  checkout_views INTEGER,
  checkout_starts INTEGER,
  checkout_abandonments INTEGER,
  completed_purchases INTEGER,
  abandonment_reasons TEXT,
  checkout_platform TEXT -- 'hotmart', 'eduzz', 'stripe', 'monetizze', 'outro'
);

-- Criar tabela para anúncios do debriefing
CREATE TABLE IF NOT EXISTS public.debriefing_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debriefing_id UUID NOT NULL REFERENCES public.debriefings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  ad_name TEXT NOT NULL,
  ad_type TEXT NOT NULL, -- 'imagem', 'video', 'carrossel', 'outros'
  platform TEXT NOT NULL, -- 'meta', 'google', 'tiktok', 'youtube', 'outra'
  campaign_objective TEXT NOT NULL, -- 'conversao', 'engajamento', 'visualizacao', 'lead', 'outro'
  view_link TEXT,
  total_spent DECIMAL(15,2),
  leads_generated INTEGER,
  sales_generated INTEGER,
  ctr DECIMAL(5,2), -- em porcentagem
  cpm DECIMAL(10,2),
  cpc DECIMAL(10,2),
  observations TEXT,
  performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
  creative_file_url TEXT
);

-- Habilitar RLS
ALTER TABLE public.debriefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_ads ENABLE ROW LEVEL SECURITY;

-- Políticas para debriefings
CREATE POLICY "Users can manage debriefings in their workspace" 
ON public.debriefings 
FOR ALL 
USING (user_belongs_to_workspace(workspace_id));

-- Políticas para anúncios
CREATE POLICY "Users can manage debriefing ads in their workspace" 
ON public.debriefing_ads 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.debriefings d 
    WHERE d.id = debriefing_ads.debriefing_id 
    AND user_belongs_to_workspace(d.workspace_id)
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_debriefings_updated_at
  BEFORE UPDATE ON public.debriefings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();