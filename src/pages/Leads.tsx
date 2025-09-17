
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeadsList from '@/components/leads/LeadsList';
import { useLeadNotifications } from '@/hooks/useLeadNotifications';

export default function Leads() {
  // Ativar notificações de novos leads
  useLeadNotifications();

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6">
        <LeadsList />
      </div>
    </DashboardLayout>
  );
}
