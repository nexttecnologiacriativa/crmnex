
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import WebhooksManager from '@/components/webhooks/WebhooksManager';
import WebhookInstructions from '@/components/webhooks/WebhookInstructions';

export default function Webhooks() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <Tabs defaultValue="manager" className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Webhooks
            </h1>
            <TabsList className="bg-white shadow-sm border">
              <TabsTrigger 
                value="manager"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Gerenciar
              </TabsTrigger>
              <TabsTrigger 
                value="instructions"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Como Usar
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="manager">
            <WebhooksManager />
          </TabsContent>
          
          <TabsContent value="instructions">
            <WebhookInstructions />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
