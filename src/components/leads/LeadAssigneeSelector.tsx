
import { useState, useEffect } from 'react';
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
import { useWorkspaces } from '@/hooks/useWorkspace';

interface LeadAssigneeSelectorProps {
  leadId: string;
  currentAssignee?: string | null;
}

export default function LeadAssigneeSelector({ leadId, currentAssignee }: LeadAssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateLead = useUpdateLead();
  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];

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

  // Atribuição automática para admin se não houver assignee
  useEffect(() => {
    if (!currentAssignee && workspaceMembers.length > 0) {
      const adminMember = workspaceMembers.find(member => member.role === 'admin');
      if (adminMember) {
        handleAssigneeChange(adminMember.user_id);
      }
    }
  }, [currentAssignee, workspaceMembers]);

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

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span className="text-xs font-medium">Dono:</span>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs px-2 hover:bg-gray-100"
          >
            <span className="truncate max-w-[80px]">
              {currentAssigneeProfile?.full_name || 'Não atribuído'}
            </span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
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
                <span className="text-gray-500 text-xs">{member.profiles?.email}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
