-- Remove a constraint restritiva de status para permitir valores customizados
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Adiciona uma nova constraint mais flexível que permite valores customizados que começam com 'custom_'
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check 
CHECK (
  status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'review'::text, 'done'::text]) 
  OR status LIKE 'custom_%'
);