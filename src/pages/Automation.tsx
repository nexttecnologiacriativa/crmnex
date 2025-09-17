import DashboardLayout from '@/components/layout/DashboardLayout';
import AutomationDashboard from '@/components/automation/AutomationDashboard';

export default function Automation() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <AutomationDashboard />
      </div>
    </DashboardLayout>
  );
}