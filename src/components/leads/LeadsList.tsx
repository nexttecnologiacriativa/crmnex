
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeads } from '@/hooks/useLeads';
import { useWorkspaces } from '@/hooks/useWorkspace';
import CreateLeadDialog from './CreateLeadDialog';
import LeadsListView from './LeadsListView';
import TagManager from './TagManager';
import LeadsFilters from './LeadsFilters';
import LeadsImportExport from './LeadsImportExport';

export default function LeadsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [source, setSource] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  console.log('LeadsList - Rendering component');
  
  const { data: workspaces, isLoading: workspacesLoading, error: workspacesError } = useWorkspaces();
  console.log('LeadsList - Workspaces:', { workspaces, workspacesLoading, workspacesError });
  
  const currentWorkspace = workspaces?.[0];
  console.log('LeadsList - Current workspace:', currentWorkspace);
  
  const { data: leads = [], isLoading: leadsLoading, error: leadsError } = useLeads();
  console.log('LeadsList - Leads data:', { leads, leadsLoading, leadsError });

  // Early loading state for workspaces
  if (workspacesLoading) {
    console.log('LeadsList - Workspaces loading...');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-purple"></div>
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
    const matchesAssignee = !assignee || 
      (assignee === 'unassigned' && !lead.assigned_to) ||
      (assignee === 'me' && lead.assigned_to) ||
      lead.assigned_to === assignee;
    const matchesStatus = !status || lead.status === status;
    
    // Filtro por data
    const leadDate = new Date(lead.created_at);
    const matchesDateFrom = !dateFrom || leadDate >= dateFrom;
    const matchesDateTo = !dateTo || leadDate <= dateTo;
    
    return matchesSearch && matchesSource && matchesAssignee && matchesStatus && matchesDateFrom && matchesDateTo;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-purple"></div>
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Leads
        </h1>
        <div className="flex items-center gap-2">
          <LeadsImportExport leads={filteredLeads} />
          <TagManager />
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
    </div>
  );
}
