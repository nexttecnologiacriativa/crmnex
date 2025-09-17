
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JobsKanban from '@/components/jobs/JobsKanban';
import JobsListView from '@/components/jobs/JobsListView';
import JobsFilters from '@/components/jobs/JobsFilters';
import CreateJobDialog from '@/components/jobs/CreateJobDialog';
import JobBoardSelector from '@/components/jobs/JobBoardSelector';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Kanban, List } from 'lucide-react';
import { useJobs, useJobBoards } from '@/hooks/useJobs';
import { useEnsureDefaultWorkspace } from '@/hooks/useWorkspace';

export default function Jobs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filters, setFilters] = useState({
    assignee: '',
    priority: '',
    search: '',
  });

  const { workspace, ensureWorkspace, isLoading: workspaceLoading } = useEnsureDefaultWorkspace();
  const { data: boards = [], isLoading: boardsLoading } = useJobBoards();
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useJobs(selectedBoardId);

  // Workspace é garantido automaticamente pelo useEnsureDefaultWorkspace
  // Removido a chamada duplicada de ensureWorkspace() que estava causando duplicação de boards

  // Selecionar automaticamente o board padrão quando os boards carregarem
  useEffect(() => {
    if (boards.length > 0 && selectedBoardId === null) {
      const defaultBoard = boards.find(board => board.is_default);
      if (defaultBoard) {
        console.log('Setting default board:', defaultBoard.id);
        setSelectedBoardId(defaultBoard.id);
      } else if (boards.length > 0) {
        console.log('No default board found, using first board:', boards[0].id);
        setSelectedBoardId(boards[0].id);
      }
    }
  }, [boards, selectedBoardId]);

  console.log('Jobs page - boards:', boards.length, 'jobs:', jobs.length);
  console.log('Selected board ID:', selectedBoardId);
  console.log('Jobs error:', jobsError);
  console.log('Boards:', boards);

  if (jobsLoading || boardsLoading || workspaceLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-nexcrm-green">
                Jobs
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie tarefas e projetos da sua equipe
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="flex items-center gap-2"
                >
                  <Kanban className="h-4 w-4" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Lista
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsFiltersOpen(true)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Plus className="h-4 w-4" />
                Novo Job
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <JobBoardSelector
              selectedBoardId={selectedBoardId}
              onBoardSelect={setSelectedBoardId}
            />
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <JobsKanban filters={filters} boardId={selectedBoardId} />
        ) : (
          <div className="bg-white border border-gray-200 p-6">
            <JobsListView filters={filters} boardId={selectedBoardId} />
          </div>
        )}

        <CreateJobDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          defaultBoardId={selectedBoardId}
        />

        <JobsFilters
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
    </DashboardLayout>
  );
}
