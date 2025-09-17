-- Criar tabela para múltiplos checkouts por debriefing
CREATE TABLE public.debriefing_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debriefing_id UUID NOT NULL,
  product_id UUID NULL, -- Relaciona checkout com produto (opcional)
  name TEXT NOT NULL,
  checkout_url TEXT,
  platform TEXT, -- Ex: "Hotmart", "Monetizze", "Kiwify", etc.
  total_views INTEGER DEFAULT 0,
  checkout_starts INTEGER DEFAULT 0,
  checkout_abandonments INTEGER DEFAULT 0,
  completed_purchases INTEGER DEFAULT 0,
  conversion_rate NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN total_views > 0 THEN (completed_purchases::NUMERIC / total_views::NUMERIC) * 100
      ELSE 0
    END
  ) STORED,
  abandonment_rate NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN checkout_starts > 0 THEN (checkout_abandonments::NUMERIC / checkout_starts::NUMERIC) * 100
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.debriefing_checkouts ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para debriefing_checkouts
CREATE POLICY "Users can manage debriefing checkouts in their workspace" 
ON public.debriefing_checkouts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.debriefings d
    WHERE d.id = debriefing_checkouts.debriefing_id 
    AND user_belongs_to_workspace(d.workspace_id)
  )
);

-- Criar trigger para updated_at
CREATE TRIGGER update_debriefing_checkouts_updated_at
  BEFORE UPDATE ON public.debriefing_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Criar índices para performance
CREATE INDEX idx_debriefing_checkouts_debriefing_id ON public.debriefing_checkouts(debriefing_id);
CREATE INDEX idx_debriefing_checkouts_product_id ON public.debriefing_checkouts(product_id);