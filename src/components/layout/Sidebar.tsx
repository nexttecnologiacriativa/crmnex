
import { Home, Users, BarChart3, CheckSquare, Workflow, Settings, LogOut, Kanban, MessageCircle, Megaphone, Search, Headphones, Tv, Bot, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navigationGroups = [
  {
    label: 'Menu',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Pipeline', href: '/pipeline', icon: Workflow },
      { name: 'Atendimento', href: '/atendimento', icon: Headphones },
      { name: 'Tarefas', href: '/tasks', icon: CheckSquare },
      { name: 'Jobs', href: '/jobs', icon: Kanban },
      { name: 'Automação', href: '/automation', icon: Bot },
      { name: 'Marketing', href: '/marketing', icon: Megaphone },
      { name: 'Outbound', href: '/outbound', icon: Search },
      { name: 'Relatórios', href: '/reports', icon: BarChart3 },
      { name: 'Dashboard TV', href: '/tv-dashboard', icon: Tv },
      { name: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    console.log('Sidebar: Starting logout process...');
    
    try {
      await signOut();
      console.log('Sidebar: SignOut completed, redirecting...');
      
      setTimeout(() => {
        console.log('Sidebar: Performing redirect to /auth');
        window.location.replace('/auth');
      }, 200);
      
    } catch (error) {
      console.error('Sidebar: Error during signout:', error);
      window.location.replace('/auth');
    }
  };

  const handleNavigation = (href: string) => {
    if (href === '/tv-dashboard') {
      window.open(href, '_blank');
      return;
    }
    
    navigate(href);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Usuário';
  const userInitials = getInitials(profile?.full_name);
  const greeting = getGreeting();

  return (
    <Sidebar 
      className="bg-white border-r border-gray-200"
      collapsible="icon"
    >
      {/* Header com Avatar e Saudação */}
      <SidebarHeader className="border-b border-gray-100 bg-white p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-blue-100">
            <AvatarImage src={profile?.avatar_url || ''} alt={userName} />
            <AvatarFallback className="bg-blue-500 text-white font-medium text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 font-medium">{greeting},</span>
              <span className="text-sm font-semibold text-gray-900 truncate">{userName}</span>
            </div>
          )}
          
          {!isCollapsed && (
            <SidebarTrigger className="ml-auto h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </SidebarTrigger>
          )}
        </div>
      </SidebarHeader>

      {/* Conteúdo do Menu */}
      <SidebarContent className="px-3 py-4 sidebar-scroll flex-1 overflow-y-auto">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        onClick={() => handleNavigation(item.href)}
                        isActive={isActive}
                        className={cn(
                          'group relative h-10 px-3 rounded-full transition-all duration-200 ease-out',
                          'hover:bg-gray-100',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                          isActive && 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/20'
                        )}
                        tooltip={item.name}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 transition-all duration-200 flex-shrink-0",
                          "group-hover:scale-105",
                          isActive ? "text-white" : "text-gray-500 group-hover:text-blue-500"
                        )} />
                        <span className={cn(
                          "font-medium transition-all duration-200 text-sm ml-3",
                          isActive ? "text-white" : "text-gray-700 group-hover:text-gray-900"
                        )}>
                          {item.name}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer com Logout */}
      <SidebarFooter className="px-3 pb-4">
        <SidebarSeparator className="bg-gray-100 mb-3" />
        <SidebarMenuButton
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start h-10 px-3 rounded-full",
            "text-gray-500 hover:text-red-600 hover:bg-red-50",
            "transition-all duration-200 group",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          )}
          tooltip="Sair"
        >
          <LogOut className="h-5 w-5 flex-shrink-0 transition-all duration-200 group-hover:scale-105" />
          <span className="font-medium text-sm ml-3">Sair</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
