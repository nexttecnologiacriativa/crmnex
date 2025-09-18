
import { Home, Users, BarChart3, CheckSquare, Workflow, Settings, LogOut, Webhook, Kanban, Menu, MessageCircle, Megaphone, Globe, Bot, FileText, Search, Headphones, Phone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Pipeline', href: '/pipeline', icon: Workflow },
  { name: 'Tarefas', href: '/tasks', icon: CheckSquare },
  { name: 'Jobs', href: '/jobs', icon: Kanban },
  { name: 'Atendimento', href: '/atendimento', icon: Headphones },
  
//  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle }, // Movido para Atendimento
//  { name: 'WhatsApp WEB', href: '/whatsapp-web', icon: Globe }, // Movido para Atendimento
  { name: 'Automação', href: '/automation', icon: Bot },
  // { name: 'Debriefing', href: '/debriefing', icon: FileText }, // Removido temporariamente
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Outbound', href: '/outbound', icon: Search },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Webhooks', href: '/webhooks', icon: Webhook },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleSignOut = async () => {
    console.log('Sidebar: Starting logout process...');
    
    try {
      await signOut();
      console.log('Sidebar: SignOut completed, redirecting...');
      
      // Aguardar um pouco mais para garantir que tudo foi limpo
      setTimeout(() => {
        console.log('Sidebar: Performing redirect to /auth');
        // Usar replace para evitar voltar com o botão voltar
        window.location.replace('/auth');
      }, 200);
      
    } catch (error) {
      console.error('Sidebar: Error during signout:', error);
      // Em caso de erro, ainda redirecionar
      window.location.replace('/auth');
    }
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    // Close mobile sidebar after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar 
      className="bg-sidebar border-r border-sidebar-border"
      collapsible="icon"
    >
        <SidebarHeader className="border-b border-gray-200 bg-gray-50 transition-all duration-300">
          <div className="flex h-12 items-center justify-center px-4">
            <img 
              src="/nexcrm-logo.png" 
              alt="NexCRM Logo" 
              className="h-6 w-auto transition-all duration-300 ease-in-out group-data-[collapsible=icon]:h-5"
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          <SidebarMenu className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <SidebarMenuItem key={item.name}>
                   <SidebarMenuButton
                    onClick={() => handleNavigation(item.href)}
                    isActive={isActive}
                    className={cn(
                      'group relative h-9 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground',
                      'transition-all duration-200 ease-out rounded-lg',
                      'hover:bg-sidebar-accent/40',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                      isActive && [
                        'bg-sidebar-accent/50 text-sidebar-foreground',
                        'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                        'before:w-1 before:h-5 before:bg-accent before:rounded-r-full'
                      ]
                    )}
                    tooltip={item.name}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 transition-all duration-200 flex-shrink-0",
                      "group-hover:scale-105",
                      isActive ? "text-accent" : "text-sidebar-foreground/60 group-hover:text-accent"
                    )} />
                    <span className={cn(
                      "font-medium transition-all duration-200 text-sm ml-2.5",
                      "group-hover:translate-x-0.5",
                      isActive ? "text-sidebar-foreground font-semibold" : "group-hover:text-sidebar-foreground"
                    )}>
                      {item.name}
                    </span>
                    {isActive && (
                      <div className="absolute right-3 w-2 h-2 bg-accent rounded-full animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="px-2 pb-3">
          <SidebarSeparator className="bg-sidebar-border mb-3 opacity-50" />
          <SidebarMenuButton
            onClick={handleSignOut}
            className={cn(
              "w-full justify-start h-9 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground",
              "hover:bg-destructive/10 hover:text-destructive",
              "rounded-lg",
              "transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            )}
            tooltip="Sair"
          >
            <LogOut className="h-4 w-4 flex-shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:text-destructive" />
            <span className="font-medium text-sm ml-2.5 group-hover:translate-x-0.5 transition-transform duration-200">Sair</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
  );
}
