import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/Sidebar';
import { useAutomationProcessor } from '@/hooks/useAutomationProcessor';
import { useWhatsAppNotifications } from '@/hooks/useWhatsAppNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Processar automações periodicamente no frontend
  useAutomationProcessor();
  
  // Ativar notificações de WhatsApp globalmente
  useWhatsAppNotifications();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-gradient-to-br from-nexcrm-blue/5 via-white to-nexcrm-green/5 flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto w-full">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}