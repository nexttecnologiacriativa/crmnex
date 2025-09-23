
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import WebhooksManager from '@/components/webhooks/WebhooksManager';
import WebhookInstructions from '@/components/webhooks/WebhookInstructions';
import MetaIntegrationsSettings from '@/components/settings/MetaIntegrationsSettings';
import { useTeamManagement } from '@/hooks/useTeamManagement';

export default function Webhooks() {
  const { currentUserRole } = useTeamManagement();

  return (
    <DashboardLayout>
      <div className="p-6">
        <Tabs defaultValue="manager" className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-nexcrm-green">
              Webhooks & Integrações
            </h1>
            <TabsList className="bg-white shadow-sm border">
              <TabsTrigger 
                value="manager"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nexcrm-blue data-[state=active]:to-nexcrm-green data-[state=active]:text-white"
              >
                Gerenciar
              </TabsTrigger>
              <TabsTrigger 
                value="meta-integrations"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-800 data-[state=active]:text-white"
              >
                Meta Lead Ads
              </TabsTrigger>
              <TabsTrigger 
                value="instructions"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nexcrm-blue data-[state=active]:to-nexcrm-green data-[state=active]:text-white"
              >
                Como Usar
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="manager">
            <WebhooksManager />
          </TabsContent>

          <TabsContent value="meta-integrations">
            <MetaIntegrationsSettings currentUserRole={currentUserRole} />
          </TabsContent>
          
          <TabsContent value="instructions">
            <WebhookInstructions />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
