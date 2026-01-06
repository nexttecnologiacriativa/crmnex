import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CustomFieldsManager from '@/components/leads/CustomFieldsManager';
import UserProfileSettings from '@/components/settings/UserProfileSettings';
import WorkspaceSettings from '@/components/settings/WorkspaceSettings';
import TeamManagement from '@/components/settings/TeamManagement';
import TagManager from '@/components/settings/TagManager';
import WhatsAppSettings from '@/components/settings/WhatsAppSettings';
import WhatsAppEvolutionSettings from '@/components/settings/WhatsAppEvolutionSettings';
import WhatsAppAutoLeadSettings from '@/components/settings/WhatsAppAutoLeadSettings';
import UtmManager from '@/components/settings/UtmManager';
import AISettings from '@/components/settings/AISettings';
import WebhooksManager from '@/components/webhooks/WebhooksManager';
import NotificationSoundSettings from '@/components/settings/NotificationSoundSettings';
import MetaIntegrationsSettings from '@/components/settings/MetaIntegrationsSettings';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import ResetWorkspace from '@/components/settings/ResetWorkspace';
import SettingsSidebar, { type SettingsSection } from '@/components/settings/SettingsSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function Settings() {
  const { currentUserRole } = useTeamManagement();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    if (isMobile) {
      setSheetOpen(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <UserProfileSettings />;
      case 'workspace':
        return (
          <div className="space-y-6">
            <WorkspaceSettings currentUserRole={currentUserRole} />
            <ResetWorkspace currentUserRole={currentUserRole} />
          </div>
        );
      case 'team':
        return <TeamManagement />;
      case 'permissions':
        return <WhatsAppAutoLeadSettings currentUserRole={currentUserRole} />;
      case 'fields':
        return <CustomFieldsManager currentUserRole={currentUserRole} />;
      case 'tags':
        return <TagManager currentUserRole={currentUserRole} />;
      case 'utms':
        return <UtmManager currentUserRole={currentUserRole} />;
      case 'whatsapp':
        return <WhatsAppSettings currentUserRole={currentUserRole} />;
      case 'whatsapp-evolution':
        return <WhatsAppEvolutionSettings currentUserRole={currentUserRole} />;
      case 'meta':
        return <MetaIntegrationsSettings currentUserRole={currentUserRole} />;
      case 'ai':
        return <AISettings currentUserRole={currentUserRole} />;
      case 'notifications':
        return <NotificationSoundSettings />;
      case 'webhooks':
        return <WebhooksManager />;
      default:
        return <UserProfileSettings />;
    }
  };

  const getSectionTitle = () => {
    const titles: Record<SettingsSection, string> = {
      profile: 'Perfil',
      workspace: 'Workspace',
      team: 'Equipe',
      permissions: 'Permissões e Automação',
      fields: 'Campos Customizados',
      tags: 'Tags',
      utms: 'UTMs',
      whatsapp: 'WhatsApp API Oficial',
      'whatsapp-evolution': 'WhatsApp WEB (Evolution)',
      meta: 'Meta Lead Ads',
      ai: 'Inteligência Artificial',
      notifications: 'Notificações',
      webhooks: 'Webhooks',
    };
    return titles[activeSection];
  };

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar - Desktop */}
        {!isMobile && (
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-4xl">
            <div className="mb-6 flex items-center gap-3">
              {/* Mobile menu trigger */}
              {isMobile && (
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    <SettingsSidebar
                      activeSection={activeSection}
                      onSectionChange={handleSectionChange}
                    />
                  </SheetContent>
                </Sheet>
              )}
              
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {getSectionTitle()}
                </h1>
                <p className="text-gray-500 text-sm mt-1 hidden md:block">
                  Gerencie suas configurações de {getSectionTitle().toLowerCase()}
                </p>
              </div>
            </div>

            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}