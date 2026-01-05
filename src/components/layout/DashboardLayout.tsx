import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/Sidebar';
import { useAutomationProcessor } from '@/hooks/useAutomationProcessor';
import { useWhatsAppNotifications } from '@/hooks/useWhatsAppNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  
  // Processar automações periodicamente no frontend
  useAutomationProcessor();
  
  // Ativar notificações de WhatsApp globalmente
  useWhatsAppNotifications();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-gradient-to-br from-nexcrm-blue/5 via-white to-nexcrm-green/5 flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto w-full flex flex-col">
          {/* Header mobile com botão hamburger */}
          {isMobile && (
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
              <SidebarTrigger className="h-9 w-9 flex items-center justify-center rounded-md border bg-background hover:bg-accent hover:text-accent-foreground">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </SidebarTrigger>
              <div className="flex-1">
                <img 
                  src="/nexcrm-logo.png" 
                  alt="NexCRM" 
                  className="h-7"
                />
              </div>
            </header>
          )}
          <div className="flex-1">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}