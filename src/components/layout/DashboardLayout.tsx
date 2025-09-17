import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/layout/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();

  // Os schedulers agora rodam automaticamente via cron jobs no banco
  // Não é mais necessário executar no frontend

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-nexcrm-blue/5 via-white to-nexcrm-green/5 flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto w-full">
          <div className="h-14 flex items-center justify-between px-4 border-b bg-white/80 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 hover:bg-gray-100 rounded-lg transition-colors" />
            </div>
          </div>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}