
import DashboardLayout from '@/components/layout/DashboardLayout';
import CustomFieldsManager from '@/components/leads/CustomFieldsManager';
import UserProfileSettings from '@/components/settings/UserProfileSettings';
import WorkspaceSettings from '@/components/settings/WorkspaceSettings';
import TeamManagement from '@/components/settings/TeamManagement';
import TagManager from '@/components/settings/TagManager';
import WhatsAppSettings from '@/components/settings/WhatsAppSettings';
import WhatsAppEvolutionSettings from '@/components/settings/WhatsAppEvolutionSettings';
import UtmManager from '@/components/settings/UtmManager';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import N8nWebhookSettings from '@/components/settings/N8nWebhookSettings';
import { N8nProcessor } from '@/components/settings/N8nProcessor';
import AISettings from '@/components/settings/AISettings';
import WebhooksManager from '@/components/webhooks/WebhooksManager';
import NotificationSoundSettings from '@/components/settings/NotificationSoundSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import ResetWorkspace from '@/components/settings/ResetWorkspace';

export default function Settings() {
  const { currentUserRole } = useTeamManagement();

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6">
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-nexcrm-green">
              Configurações
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie suas configurações pessoais, workspace e integrações.
            </p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-11 bg-white shadow-sm border">
              <TabsTrigger 
                value="profile"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Perfil
              </TabsTrigger>
              <TabsTrigger 
                value="workspace"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Workspace
              </TabsTrigger>
              <TabsTrigger 
                value="team"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Equipe
              </TabsTrigger>
              <TabsTrigger 
                value="fields"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Campos
              </TabsTrigger>
              <TabsTrigger 
                value="tags"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Tags
              </TabsTrigger>
              <TabsTrigger 
                value="utms"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                UTMs
              </TabsTrigger>
              <TabsTrigger 
                value="whatsapp"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                WhatsApp API
              </TabsTrigger>
              <TabsTrigger 
                value="whatsapp-evolution"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                WhatsApp WEB
              </TabsTrigger>
              <TabsTrigger 
                value="ai"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                IA
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Notificações
              </TabsTrigger>
              <TabsTrigger 
                value="webhooks"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Webhooks
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              <UserProfileSettings />
            </TabsContent>
            
            <TabsContent value="workspace" className="mt-6 space-y-6">
              <WorkspaceSettings currentUserRole={currentUserRole} />
              <ResetWorkspace currentUserRole={currentUserRole} />
            </TabsContent>
            
            <TabsContent value="team" className="mt-6">
              <TeamManagement />
            </TabsContent>
            
            <TabsContent value="fields" className="mt-6">
              <CustomFieldsManager currentUserRole={currentUserRole} />
            </TabsContent>

            <TabsContent value="tags" className="mt-6">
              <TagManager currentUserRole={currentUserRole} />
            </TabsContent>

            <TabsContent value="utms" className="mt-6">
              <UtmManager currentUserRole={currentUserRole} />
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-6">
              <WhatsAppSettings currentUserRole={currentUserRole} />
            </TabsContent>

            <TabsContent value="whatsapp-evolution" className="mt-6">
              <WhatsAppEvolutionSettings currentUserRole={currentUserRole} />
            </TabsContent>


            <TabsContent value="ai" className="mt-6">
              <AISettings currentUserRole={currentUserRole} />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <NotificationSoundSettings />
            </TabsContent>

            <TabsContent value="webhooks" className="mt-6">
              <WebhooksManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
