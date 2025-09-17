-- Criar tabela para logs do scheduler
CREATE TABLE IF NOT EXISTS public.scheduler_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campaigns_found INTEGER DEFAULT 0,
    campaigns_processed INTEGER DEFAULT 0,
    campaigns_successful INTEGER DEFAULT 0,
    campaigns_failed INTEGER DEFAULT 0,
    execution_duration_ms INTEGER,
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.scheduler_logs ENABLE ROW LEVEL SECURITY;

-- Permitir que super admins vejam todos os logs
CREATE POLICY "Super admins can view all scheduler logs" ON public.scheduler_logs
    FOR SELECT USING (is_super_admin(auth.uid()));

-- Permitir que o service role insira logs
CREATE POLICY "Service role can insert scheduler logs" ON public.scheduler_logs
    FOR INSERT WITH CHECK (TRUE);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_execution_time ON public.scheduler_logs(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_created_at ON public.scheduler_logs(created_at DESC);

-- Função para limpar logs antigos (manter apenas os últimos 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_scheduler_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    DELETE FROM public.scheduler_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
$$;

-- Função para obter estatísticas do scheduler
CREATE OR REPLACE FUNCTION public.get_scheduler_stats()
RETURNS TABLE(
    last_execution TIMESTAMP WITH TIME ZONE,
    total_executions BIGINT,
    avg_campaigns_per_execution NUMERIC,
    success_rate NUMERIC,
    last_24h_executions BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT 
        MAX(execution_time) as last_execution,
        COUNT(*) as total_executions,
        AVG(campaigns_found) as avg_campaigns_per_execution,
        CASE 
            WHEN SUM(campaigns_processed) > 0 
            THEN (SUM(campaigns_successful)::NUMERIC / SUM(campaigns_processed)) * 100
            ELSE 0
        END as success_rate,
        COUNT(*) FILTER (WHERE execution_time > NOW() - INTERVAL '24 hours') as last_24h_executions
    FROM public.scheduler_logs
    WHERE created_at > NOW() - INTERVAL '7 days';
$$;