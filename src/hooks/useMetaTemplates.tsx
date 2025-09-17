import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';

interface MetaTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  category: string;
  components?: any[];
}

export function useMetaTemplates() {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentWorkspace } = useWorkspace();

  const fetchTemplates = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);

      // Usar edge function para buscar templates
      const { data, error } = await supabase.functions.invoke('whatsapp-templates', {
        body: { action: 'list' }
      });

      if (error) {
        console.error('Erro ao buscar templates:', error);
        setMockTemplates();
        return;
      }

      // A edge function retorna { success: true, templates: [] }
      const templates = data?.templates || [];
      console.log('Templates encontrados:', templates.length);
      
      // Mapear templates para o formato esperado
      const mappedTemplates = templates.map((template: any) => ({
        id: template.id,
        name: template.name,
        status: template.status,
        language: template.language,
        category: template.category,
        components: template.components
      }));
      
      setTemplates(mappedTemplates);
      
      if (mappedTemplates.length === 0) {
        setMockTemplates();
      }

    } catch (error) {
      console.error('Error fetching templates:', error);
      setMockTemplates();
    } finally {
      setLoading(false);
    }
  };

  const setMockTemplates = () => {
    const mockTemplates: MetaTemplate[] = [
      {
        id: 'welcome_message',
        name: 'welcome_message',
        status: 'APPROVED',
        language: 'pt_BR',
        category: 'MARKETING',
        components: [
          {
            type: 'BODY',
            text: 'Olá! Seja bem-vindo(a)! Como podemos ajudá-lo(a) hoje?'
          }
        ]
      },
      {
        id: 'follow_up',
        name: 'follow_up',
        status: 'APPROVED',
        language: 'pt_BR',
        category: 'MARKETING',
        components: [
          {
            type: 'BODY',
            text: 'Oi! Passando aqui para saber se tem alguma dúvida que posso esclarecer.'
          }
        ]
      },
      {
        id: 'appointment_reminder',
        name: 'appointment_reminder',
        status: 'APPROVED',
        language: 'pt_BR',
        category: 'UTILITY',
        components: [
          {
            type: 'BODY',
            text: 'Lembrete: Você tem um agendamento marcado. Confirme sua presença.'
          }
        ]
      }
    ];

    setTemplates(mockTemplates);
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentWorkspace?.id]);

  return {
    templates,
    loading,
    refreshTemplates: fetchTemplates,
    // Para compatibilidade com componentes existentes
    data: templates,
    isLoading: loading,
    refetch: fetchTemplates
  };
}

// Funções mock para compatibilidade
export function useCreateMetaTemplate() {
  return {
    mutateAsync: async (templateData: any) => {
      // Mock implementation
      console.log('Creating template:', templateData);
      throw new Error('Funcionalidade ainda não implementada');
    },
    isPending: false
  };
}

export function useSendMetaTemplate() {
  const [isPending, setIsPending] = useState(false);
  
  return {
    mutateAsync: async (data: any) => {
      setIsPending(true);
      try {
        const { data: result, error } = await supabase.functions.invoke('whatsapp-templates', {
          body: { 
            action: 'send',
            to: data.to,
            templateName: data.templateName,
            language: data.language,
            components: data.components
          }
        });

        if (error) throw error;
        return result;
      } finally {
        setIsPending(false);
      }
    },
    isPending
  };
}

export function useDeleteMetaTemplate() {
  return {
    mutateAsync: async (templateId: string) => {
      // Mock implementation
      console.log('Deleting template:', templateId);
      throw new Error('Funcionalidade ainda não implementada');
    },
    isPending: false
  };
}