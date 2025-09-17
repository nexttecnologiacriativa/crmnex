-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS update_whatsapp_sync_status_updated_at ON public.whatsapp_sync_status;

-- Create trigger for automatic timestamp updates usando a função existente
CREATE TRIGGER update_whatsapp_sync_status_updated_at
BEFORE UPDATE ON public.whatsapp_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.update_whatsapp_sync_status_updated_at();