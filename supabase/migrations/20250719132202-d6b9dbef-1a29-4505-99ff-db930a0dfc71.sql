-- Criar tabela de configurações globais do debriefing
CREATE TABLE public.debriefing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  fixed_cost NUMERIC DEFAULT 0,
  tax_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  default_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de produtos vendidos por debriefing
CREATE TABLE public.debriefing_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debriefing_id UUID NOT NULL,
  product_id UUID NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC GENERATED ALWAYS AS (unit_price * quantity_sold) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de páginas por debriefing
CREATE TABLE public.debriefing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debriefing_id UUID NOT NULL,
  name TEXT NOT NULL,
  page_url TEXT,
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  cta_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN total_views > 0 THEN (conversions::NUMERIC / total_views) * 100
      ELSE 0
    END
  ) STORED,
  avg_time_on_page INTEGER DEFAULT 0,
  predominant_device TEXT,
  predominant_traffic_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.debriefing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_pages ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can manage debriefing settings in their workspace" 
ON public.debriefing_settings 
FOR ALL 
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can manage products in their workspace" 
ON public.products 
FOR ALL 
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can manage debriefing products in their workspace" 
ON public.debriefing_products 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.debriefings d 
  WHERE d.id = debriefing_products.debriefing_id 
  AND user_belongs_to_workspace(d.workspace_id)
));

CREATE POLICY "Users can manage debriefing pages in their workspace" 
ON public.debriefing_pages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.debriefings d 
  WHERE d.id = debriefing_pages.debriefing_id 
  AND user_belongs_to_workspace(d.workspace_id)
));

-- Criar trigger para updated_at
CREATE TRIGGER update_debriefing_settings_updated_at
  BEFORE UPDATE ON public.debriefing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Adicionar campos calculados ao debriefing principal
ALTER TABLE public.debriefings 
ADD COLUMN net_revenue_calculated NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN gross_revenue IS NOT NULL THEN gross_revenue - COALESCE(total_investment, 0)
    ELSE NULL
  END
) STORED;

-- Adicionar campo para armazenar o faturamento líquido com impostos e custos fixos
ALTER TABLE public.debriefings 
ADD COLUMN net_revenue_with_costs NUMERIC;