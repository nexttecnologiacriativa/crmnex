import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MessageCircle, AlertCircle } from 'lucide-react';
import UnifiedAtendimento from '@/components/whatsapp/UnifiedAtendimento';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function Atendimento() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const { data: evolutionConfig, isLoading } = useQuery({
    queryKey: ['whatsapp-evolution-config', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_evolution_configs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!evolutionConfig || !evolutionConfig.api_url || !evolutionConfig.global_api_key) {
    return (
      <DashboardLayout>
        <div className="space-y-6 mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atendimento não disponível</AlertTitle>
            <AlertDescription>
              A aba de atendimento ainda não está disponível para este usuário. 
              É necessário configurar a Evolution API nas configurações do WhatsApp.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => navigate('/settings')}>
              Ir para Configurações
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 mt-4">
        <UnifiedAtendimento />
      </div>
    </DashboardLayout>
  );
}
