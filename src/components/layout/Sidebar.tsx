
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
      className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-r border-purple-500/20 shadow-2xl"
      collapsible="icon"
    >
        <SidebarHeader className="border-b border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-transparent">
          <div className="flex h-16 items-center justify-center px-4">
            <img 
              src="/lovable-uploads/4091be8d-e1f4-45e9-b8f6-d31a101b2ed1.png" 
              alt="Glav Logo" 
              className="h-8 transition-all duration-300 group-data-[collapsible=icon]:h-6" 
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <SidebarMenu className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.href)}
                    isActive={isActive}
                    className={cn(
                      'group relative h-10 px-3 text-purple-100/80 hover:text-white transition-all duration-300 rounded-lg',
                      'hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-purple-700/20',
                      'hover:shadow-lg hover:shadow-purple-600/25',
                      isActive && [
                        'bg-gradient-to-r from-purple-600/30 to-purple-700/30',
                        'text-white shadow-lg shadow-purple-600/30',
                        'border border-purple-500/30',
                        'backdrop-blur-sm'
                      ]
                    )}
                    tooltip={item.name}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 transition-all duration-300 flex-shrink-0",
                      isActive ? "text-purple-200" : "text-purple-300/70 group-hover:text-purple-200"
                    )} />
                    <span className={cn(
                      "font-medium transition-all duration-300 text-sm",
                      isActive ? "text-white" : "group-hover:text-white"
                    )}>
                      {item.name}
                    </span>
                    {isActive && (
                      <div className="absolute right-2 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="px-3 pb-4">
          <SidebarSeparator className="bg-purple-500/30 mb-3" />
          <SidebarMenuButton
            onClick={handleSignOut}
            className={cn(
              "w-full justify-start h-10 px-3 text-purple-100/80 hover:text-white",
              "hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20",
              "hover:shadow-lg hover:shadow-red-500/25 rounded-lg",
              "transition-all duration-300 group"
            )}
            tooltip="Sair"
          >
            <LogOut className="h-4 w-4 flex-shrink-0 transition-all duration-300 group-hover:text-red-300" />
            <span className="font-medium text-sm">Sair</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
  );
}
