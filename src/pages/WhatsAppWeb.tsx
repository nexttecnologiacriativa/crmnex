import DashboardLayout from '@/components/layout/DashboardLayout';
import WhatsAppEvolutionInterface from '@/components/whatsapp/WhatsAppEvolutionInterface';

export default function WhatsAppWeb() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <WhatsAppEvolutionInterface />
      </div>
    </DashboardLayout>
  );
}