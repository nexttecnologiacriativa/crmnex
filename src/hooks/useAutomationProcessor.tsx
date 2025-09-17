import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';

export function useAutomationProcessor() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { currentWorkspace } = useWorkspace();

  const processAutomationQueue = async () => {
    if (!currentWorkspace?.id) return;

    try {
      console.log('🤖 Processing automation queue...');
      
      const { data, error } = await supabase.functions.invoke('automation-processor');
      
      if (error) {
        console.error('❌ Error processing automation queue:', error);
        return;
      }
      
      if (data?.processed_items > 0) {
        console.log(`✅ Processed ${data.processed_items} automation items`);
      }
      
    } catch (error) {
      console.error('❌ Error in automation processor:', error);
    }
  };

  useEffect(() => {
    // Desabilitado - agora usa cron jobs no banco de dados
    // Para evitar conflitos com os schedulers automáticos
    console.log('🔄 Automation processor hook desabilitado - usando cron jobs');
  }, [currentWorkspace?.id]);

  return {
    processAutomationQueue
  };
}