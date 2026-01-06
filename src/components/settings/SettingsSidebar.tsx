import { User, Building2, Users, Settings2, Tag, Link2, MessageSquare, Webhook, Bot, Bell, Share2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AvatarUpload from './AvatarUpload';

export type SettingsSection = 
  | 'profile'
  | 'workspace'
  | 'team'
  | 'permissions'
  | 'fields'
  | 'tags'
  | 'utms'
  | 'whatsapp'
  | 'whatsapp-evolution'
  | 'meta'
  | 'ai'
  | 'notifications'
  | 'webhooks';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const menuGroups = [
  {
    label: 'Conta',
    items: [
      { id: 'profile' as const, label: 'Perfil', icon: User },
      { id: 'workspace' as const, label: 'Workspace', icon: Building2 },
      { id: 'team' as const, label: 'Equipe', icon: Users },
      { id: 'permissions' as const, label: 'Permissões', icon: Shield },
    ],
  },
  {
    label: 'Personalização',
    items: [
      { id: 'fields' as const, label: 'Campos Customizados', icon: Settings2 },
      { id: 'tags' as const, label: 'Tags', icon: Tag },
      { id: 'utms' as const, label: 'UTMs', icon: Link2 },
    ],
  },
  {
    label: 'Integrações',
    items: [
      { id: 'whatsapp' as const, label: 'WhatsApp API', icon: MessageSquare },
      { id: 'whatsapp-evolution' as const, label: 'WhatsApp WEB', icon: MessageSquare },
      { id: 'meta' as const, label: 'Meta Lead Ads', icon: Share2 },
      { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
    ],
  },
  {
    label: 'Avançado',
    items: [
      { id: 'ai' as const, label: 'Inteligência Artificial', icon: Bot },
      { id: 'notifications' as const, label: 'Notificações', icon: Bell },
    ],
  },
];

export default function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const { profile } = useAuth();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full min-h-[calc(100vh-6rem)]">
      {/* User Card */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col items-center text-center">
          <AvatarUpload size="lg" />
          <h3 className="mt-3 font-semibold text-gray-900 truncate max-w-full">
            {profile?.full_name || 'Usuário'}
          </h3>
          <p className="text-sm text-gray-500 truncate max-w-full">
            {profile?.email}
          </p>
        </div>
      </div>

      {/* Menu Groups */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <h4 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {group.label}
            </h4>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-gray-400')} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
