
import DashboardLayout from '@/components/layout/DashboardLayout';
import WhatsAppWebInterface from '@/components/whatsapp/WhatsAppWebInterface';

export default function WhatsApp() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <WhatsAppWebInterface />
      </div>
    </DashboardLayout>
  );
}
