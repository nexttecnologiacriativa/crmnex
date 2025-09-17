import InstanceManager from '@/components/whatsapp/evolution/InstanceManager';

interface WhatsAppEvolutionSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function WhatsAppEvolutionSettings({ currentUserRole }: WhatsAppEvolutionSettingsProps) {
  return <InstanceManager currentUserRole={currentUserRole} />;
}