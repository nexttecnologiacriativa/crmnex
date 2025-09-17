
import DashboardLayout from '@/components/layout/DashboardLayout';
import MarketingDashboard from '@/components/marketing/MarketingDashboard';

export default function Marketing() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <MarketingDashboard />
      </div>
    </DashboardLayout>
  );
}
