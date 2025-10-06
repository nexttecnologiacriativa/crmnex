import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';

// Lock global para garantir apenas uma instância processando
const PROCESSING_LOCK_KEY = 'automation_processor_lock';
const LOCK_DURATION = 35000; // 35 segundos (maior que o intervalo)

export function useAutomationProcessor() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { currentWorkspace } = useWorkspace();
  const isProcessingRef = useRef(false);

  const acquireLock = (): boolean => {
    const now = Date.now();
    const lockData = localStorage.getItem(PROCESSING_LOCK_KEY);
    
    if (lockData) {
      const lockTime = parseInt(lockData, 10);
      if (now - lockTime < LOCK_DURATION) {
        return false; // Já existe um lock ativo
      }
    }
    
    // Adquirir lock
    localStorage.setItem(PROCESSING_LOCK_KEY, now.toString());
    return true;
  };

  const releaseLock = () => {
    localStorage.removeItem(PROCESSING_LOCK_KEY);
  };

  const processAutomationQueue = async () => {
    if (!currentWorkspace?.id) return;
    if (isProcessingRef.current) {
      console.log('⏭️ Automation processor already running, skipping...');
      return;
    }

    // Tentar adquirir lock
    if (!acquireLock()) {
      console.log('🔒 Another instance is processing, skipping...');
      return;
    }

    try {
      isProcessingRef.current = true;
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
    } finally {
      isProcessingRef.current = false;
      releaseLock();
    }
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    // Processar com delay inicial de 2 segundos (debounce inicial)
    const initialTimeout = setTimeout(() => {
      processAutomationQueue();
    }, 2000);

    // Processar a cada 30 segundos
    intervalRef.current = setInterval(() => {
      processAutomationQueue();
    }, 30000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      releaseLock();
    };
  }, [currentWorkspace?.id]);

  return {
    processAutomationQueue
  };
}