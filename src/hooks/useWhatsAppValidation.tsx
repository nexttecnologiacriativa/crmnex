import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from './useWorkspace';

interface WhatsAppValidationResult {
  phone: string;
  hasWhatsApp: boolean;
}

export function useWhatsAppValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const { currentWorkspace } = useWorkspace();

  /**
   * Valida se um número tem WhatsApp via Evolution API
   */
  const validateSingleNumber = async (phone: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'checkWhatsApp',
          phone: phone,
          workspaceId: currentWorkspace?.id
        }
      });

      if (error) {
        console.error('Erro ao validar WhatsApp:', error);
        return false;
      }

      return data?.hasWhatsApp || false;
    } catch (error) {
      console.error('Erro ao validar WhatsApp:', error);
      return false;
    }
  };

  /**
   * Valida múltiplos números em paralelo
   * Retorna apenas os números que têm WhatsApp
   */
  const validateWhatsAppBatch = async (
    phones: string[]
  ): Promise<WhatsAppValidationResult[]> => {
    if (!phones || phones.length === 0) {
      return [];
    }

    setIsValidating(true);

    try {
      // Validar todos em paralelo com timeout de 5s cada
      const validationPromises = phones.map(async (phone) => {
        try {
          const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 5000);
          });

          const validationPromise = validateSingleNumber(phone);
          const hasWhatsApp = await Promise.race([validationPromise, timeoutPromise]);

          return {
            phone,
            hasWhatsApp
          };
        } catch (error) {
          console.error(`Erro ao validar ${phone}:`, error);
          return {
            phone,
            hasWhatsApp: false
          };
        }
      });

      const results = await Promise.all(validationPromises);
      return results;
    } catch (error) {
      console.error('Erro na validação em lote:', error);
      toast.error('Erro ao validar números no WhatsApp');
      return phones.map(phone => ({ phone, hasWhatsApp: false }));
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateWhatsAppBatch,
    isValidating
  };
}
