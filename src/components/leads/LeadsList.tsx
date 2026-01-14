
import { useState, useEffect } from 'react';
import { Plus, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeads } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDuplicateLeads } from '@/hooks/useMergeLeads';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import CreateLeadDialog from './CreateLeadDialog';
import LeadsListView from './LeadsListView';
import TagManager from './TagManager';
import LeadsFilters from './LeadsFilters';
import LeadsImportExport from './LeadsImportExport';
import DuplicateLeadsManager from './DuplicateLeadsManager';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function LeadsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [source, setSource] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  
  const { user } = useAuth();
  const { data: duplicateGroups = [] } = useDuplicateLeads();
  const duplicateCount = duplicateGroups.reduce((acc, group) => acc + group.leads.length - 1, 0);
  
  console.log('LeadsList - Rendering component');
  
  const { currentWorkspace, isLoading: workspacesLoading, error: workspacesError } = useWorkspace();
  console.log('LeadsList - Current workspace:', currentWorkspace);

  // Check if user is admin
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return null;
      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();
      return data?.role || 'member';
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
  });

  const isAdmin = userRole === 'admin';

  // Non-admins always see only their leads
  useEffect(() => {
    if (!isAdmin && viewMode === 'all') {
      setViewMode('mine');
    }
  }, [isAdmin, viewMode]);
  console.log('LeadsList - Current workspace:', currentWorkspace);
  
  const { data: leads = [], isLoading: leadsLoading, error: leadsError } = useLeads();
  console.log('LeadsList - Leads data:', { leads, leadsLoading, leadsError });

  // Early loading state for workspaces
  if (workspacesLoading) {
    console.log('LeadsList - Workspaces loading...');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
      </div>
    );
  }

  // Error handling for workspaces
  if (workspacesError) {
    console.error('LeadsList - Workspaces error:', workspacesError);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar workspace</p>
          <p className="text-gray-500 text-sm">{workspacesError.message}</p>
        </div>
      </div>
    );
  }

  // No workspace available
  if (!currentWorkspace) {
    console.log('LeadsList - No current workspace found');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Nenhum workspace encontrado</p>
        </div>
      </div>
    );
  }

  const filteredLeads = leads.filter(lead => {
    const leadDisplayName = lead.name || lead.email || '';
    const matchesSearch = leadDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = !source || lead.source === source;
    
    // Fix the "me" filter - compare with actual user ID
    let matchesAssignee = true;
    if (assignee === 'unassigned') {
      matchesAssignee = !lead.assigned_to;
    } else if (assignee === 'me') {
      matchesAssignee = lead.assigned_to === user?.id;
    } else if (assignee) {
      matchesAssignee = lead.assigned_to === assignee;
    }
    
    const matchesStatus = !status || lead.status === status;
    
    // Filtro por data
    const leadDate = new Date(lead.created_at);
    const matchesDateFrom = !dateFrom || leadDate >= dateFrom;
    const matchesDateTo = !dateTo || leadDate <= dateTo;

    // Apply view mode filter (mine vs all)
    let matchesViewMode = true;
    if (viewMode === 'mine' && !isAdmin) {
      // Non-admins always see only their leads (enforced by useLeads hook)
      matchesViewMode = true;
    } else if (viewMode === 'mine' && isAdmin) {
      // Admins in "mine" mode see only their leads
      matchesViewMode = lead.assigned_to === user?.id;
    }
    // viewMode === 'all' shows everything (only available for admins)
    
    return matchesSearch && matchesSource && matchesAssignee && matchesStatus && matchesDateFrom && matchesDateTo && matchesViewMode;
  }).sort((a, b) => {
    // Ordenar por updated_at decrescente (mais recente primeiro)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const handleClearFilters = () => {
    setSource('');
    setSearchTerm('');
    setAssignee('');
    setStatus('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  if (leadsLoading) {
    console.log('LeadsList - Leads loading...');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
      </div>
    );
  }

  if (leadsError) {
    console.error('LeadsList - Leads error:', leadsError);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar leads</p>
          <p className="text-gray-500 text-sm">{leadsError.message}</p>
        </div>
      </div>
    );
  }

  console.log('LeadsList - Rendering main content');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-nexcrm-green">
            Leads
          </h1>
          {/* View mode toggle - only visible for admins */}
          {isAdmin && (
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setViewMode(value as 'mine' | 'all')}
              className="bg-muted p-1 rounded-lg"
            >
              <ToggleGroupItem value="mine" size="sm" className="text-xs px-3">
                <Eye className="h-3 w-3 mr-1" />
                Meus
              </ToggleGroupItem>
              <ToggleGroupItem value="all" size="sm" className="text-xs px-3">
                Todos
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LeadsImportExport leads={filteredLeads} />
          <TagManager />
          <Button 
            variant="outline" 
            onClick={() => setIsDuplicatesOpen(true)}
            className="relative"
          >
            <Users className="h-4 w-4 mr-2" />
            Duplicatas
            {duplicateCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {duplicateCount}
              </span>
            )}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gradient-premium text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      <LeadsFilters
        search={searchTerm}
        onSearchChange={setSearchTerm}
        source={source}
        onSourceChange={setSource}
        assignee={assignee}
        onAssigneeChange={setAssignee}
        status={status}
        onStatusChange={setStatus}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClearFilters={handleClearFilters}
      />

      <LeadsListView filteredLeads={filteredLeads} />

      {filteredLeads.length === 0 && !leadsLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Nenhum lead encontrado</p>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="mt-4 gradient-premium text-white"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar primeiro lead
          </Button>
        </div>
      )}

      <CreateLeadDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <DuplicateLeadsManager
        open={isDuplicatesOpen}
        onOpenChange={setIsDuplicatesOpen}
      />
    </div>
  );
}
