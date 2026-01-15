
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, ChevronDown } from 'lucide-react';
import { useUpdateLead } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';

interface LeadAssigneeSelectorProps {
  leadId: string;
  currentAssignee?: string | null;
  compact?: boolean;
}

export default function LeadAssigneeSelector({ leadId, currentAssignee, compact = false }: LeadAssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateLead = useUpdateLead();
  const { currentWorkspace } = useWorkspace();

  // Buscar membros do workspace atual
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          role,
          profiles!workspace_members_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('workspace_id', currentWorkspace.id);

      if (error) {
        console.error('Erro ao buscar membros do workspace:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const currentAssigneeProfile = workspaceMembers.find(
    member => member.user_id === currentAssignee
  )?.profiles;

  const handleAssigneeChange = async (userId: string | null) => {
    try {
      await updateLead.mutateAsync({
        id: leadId,
        assigned_to: userId,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao atribuir lead:', error);
    }
  };

  // Compact mode for Kanban cards
  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 text-[10px] px-1.5 py-0 hover:bg-muted/50 gap-1"
          >
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="truncate max-w-[80px] text-muted-foreground">
              {currentAssigneeProfile?.full_name || 'Não atribuído'}
            </span>
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px] bg-popover">
          <DropdownMenuItem 
            onClick={() => handleAssigneeChange(null)}
            className="text-xs"
          >
            <User className="h-3 w-3 mr-2" />
            Sem atribuição
          </DropdownMenuItem>
          {workspaceMembers.map((member) => (
            <DropdownMenuItem
              key={member.user_id}
              onClick={() => handleAssigneeChange(member.user_id)}
              className="text-xs"
            >
              <User className="h-3 w-3 mr-2" />
              <div className="flex flex-col">
                <span>{member.profiles?.full_name}</span>
                <span className="text-muted-foreground text-xs">{member.profiles?.email}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default full mode
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="text-xs font-medium">Dono:</span>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs px-2 hover:bg-muted"
          >
            <span className="truncate max-w-[80px]">
              {currentAssigneeProfile?.full_name || 'Não atribuído'}
            </span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px] bg-popover">
          <DropdownMenuItem 
            onClick={() => handleAssigneeChange(null)}
            className="text-xs"
          >
            <User className="h-3 w-3 mr-2" />
            Sem atribuição
          </DropdownMenuItem>
          {workspaceMembers.map((member) => (
            <DropdownMenuItem
              key={member.user_id}
              onClick={() => handleAssigneeChange(member.user_id)}
              className="text-xs"
            >
              <User className="h-3 w-3 mr-2" />
              <div className="flex flex-col">
                <span>{member.profiles?.full_name}</span>
                <span className="text-muted-foreground text-xs">{member.profiles?.email}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
