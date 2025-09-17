
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users, Calendar, Send, Plus, TrendingUp, Play, Activity } from 'lucide-react';
import CampaignsList from './CampaignsList';
import CreateCampaignDialog from './CreateCampaignDialog';
import CampaignAnalytics from './CampaignAnalytics';
import { useWhatsAppOfficialConfig } from '@/hooks/useWhatsAppOfficial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function MarketingDashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);
  const { data: config } = useWhatsAppOfficialConfig();

  const isConfigured = config?.is_active && config?.access_token && config?.phone_number_id;

  const runSchedulerManually = async () => {
    setIsRunningScheduler(true);
    try {
      console.log('🚀 Executando scheduler manualmente...');
      
      const { data, error } = await supabase.functions.invoke('marketing-campaign-scheduler', {
        body: {}
      });

      if (error) {
        console.error('❌ Erro ao executar scheduler:', error);
        toast.error(`Erro ao executar scheduler: ${error.message}`);
        return;
      }

      console.log('✅ Scheduler executado com sucesso:', data);
      
      if (data?.results && data.results.length > 0) {
        const successCount = data.results.filter((r: any) => r.status === 'success').length;
        toast.success(`Scheduler executado! ${successCount} campanhas processadas.`);
      } else {
        toast.info('Scheduler executado! Nenhuma campanha agendada para envio.');
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro inesperado ao executar scheduler');
    } finally {
      setIsRunningScheduler(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                WhatsApp Marketing
              </CardTitle>
              <CardDescription>
                Envio em massa via API oficial com segmentação avançada
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={isConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {isConfigured ? 'API Configurada' : 'API Não Configurada'}
              </Badge>
              <div className="flex gap-2">
                <Button
                  onClick={runSchedulerManually}
                  disabled={!isConfigured || isRunningScheduler}
                  variant="outline"
                  size="sm"
                >
                  {isRunningScheduler ? (
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isRunningScheduler ? 'Executando...' : 'Executar Scheduler'}
                </Button>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Campanha
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {!isConfigured && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-yellow-900 mb-2">⚙️ Configuração Necessária</h3>
              <p className="text-yellow-800 mb-3">
                Para usar o Marketing WhatsApp, você precisa configurar a API oficial.
              </p>
              <Button
                onClick={() => window.location.href = '/settings'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir para Configurações
              </Button>
            </div>
          )}

          <Tabs defaultValue="campaigns" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Campanhas
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Agendadas
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="campaigns" className="mt-6">
              <CampaignsList />
            </TabsContent>
            
            <TabsContent value="scheduled" className="mt-6">
              <CampaignsList filter="scheduled" />
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <CampaignAnalytics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateCampaignDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
