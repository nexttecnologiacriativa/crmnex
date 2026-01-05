import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PipelineKanban from '@/components/pipeline/PipelineKanban';
import PipelineListView from '@/components/pipeline/PipelineListView';
import PipelineSelector from '@/components/pipeline/PipelineSelector';
import { PipelineFilters, ActiveFilterBadges, defaultFilters, PipelineFiltersState } from '@/components/pipeline/PipelineFilters';
import { usePipelines } from '@/hooks/usePipeline';
import { useEnsureDefaultWorkspace } from '@/hooks/useWorkspace';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutGrid, List, CheckSquare, Square, Search } from 'lucide-react';

export default function Pipeline() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [filters, setFilters] = useState<PipelineFiltersState>(defaultFilters);
  const [quickSearch, setQuickSearch] = useState('');
  
  const isMobile = useIsMobile();

  // Debounce para busca rápida
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: quickSearch }));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [quickSearch]);
  
  const { members = [] } = useTeamManagement();

  const { workspace, isLoading: workspaceLoading } = useEnsureDefaultWorkspace();
  const { data: pipelines = [] } = usePipelines(workspace?.id);
  const { data: workspaceSettings } = useWorkspaceSettings();

  // Auto-selecionar pipeline padrão apenas na primeira carga
  useEffect(() => {
    if (pipelines.length > 0 && selectedPipelineId === null && workspaceSettings) {
      let targetPipelineId = null;
      
      // Priorizar pipeline padrão do workspace
      if (workspaceSettings.default_pipeline_id) {
        const defaultPipeline = pipelines.find(p => p.id === workspaceSettings.default_pipeline_id);
        if (defaultPipeline) {
          console.log('Auto-selecting default pipeline:', defaultPipeline.name);
          targetPipelineId = defaultPipeline.id;
        }
      }
      
      // Fallback para o primeiro pipeline se não houver padrão válido
      if (!targetPipelineId) {
        console.log('Auto-selecting first pipeline (fallback):', pipelines[0].name);
        targetPipelineId = pipelines[0].id;
      }
      
      setSelectedPipelineId(targetPipelineId);
    }
  }, [pipelines, workspaceSettings, selectedPipelineId]);

  // Log para debugging
  useEffect(() => {
    console.log('Pipeline page - workspace:', workspace?.id, 'pipelines count:', pipelines.length, 'default:', workspaceSettings?.default_pipeline_id);
  }, [workspace, pipelines, workspaceSettings]);

  if (workspaceLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Configurando workspace e pipeline...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 md:p-6 h-[calc(100vh-2rem)] md:h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        <div className="mb-4 md:mb-6">
          {/* Header - responsivo */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-nexcrm-green">
              Pipeline
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <PipelineFilters filters={filters} onFiltersChange={setFilters} />
              {viewMode === 'kanban' && !isMobile && (
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    setSelectedLeads([]);
                  }}
                >
                  {selectionMode ? <CheckSquare className="h-4 w-4 md:mr-2" /> : <Square className="h-4 w-4 md:mr-2" />}
                  <span className="hidden md:inline">
                    {selectionMode ? 'Sair da Seleção' : 'Seleção Múltipla'}
                  </span>
                  {selectionMode && selectedLeads.length > 0 && (
                    <span className="ml-1 md:ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
                      {selectedLeads.length}
                    </span>
                  )}
                </Button>
              )}
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="px-2 md:px-3"
              >
                <LayoutGrid className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Kanban</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-2 md:px-3"
              >
                <List className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Lista</span>
              </Button>
            </div>
          </div>
          
          {/* Controles secundários - responsivo */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <PipelineSelector 
              selectedPipelineId={selectedPipelineId}
              onPipelineChange={setSelectedPipelineId}
            />
            <div className="relative flex-1 md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lead..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="hidden md:block">
              <ActiveFilterBadges
                filters={filters}
                members={members}
                onRemoveFilter={(key) => {
                  if (key === 'tags') {
                    setFilters(prev => ({ ...prev, tags: [] }));
                  } else if (key === 'hasValue') {
                    setFilters(prev => ({ ...prev, hasValue: null }));
                  } else {
                    setFilters(prev => ({ ...prev, [key]: '' }));
                  }
                }}
              />
            </div>
          </div>
          
          {/* Badges de filtro em mobile - linha separada */}
          <div className="md:hidden mt-2">
            <ActiveFilterBadges
              filters={filters}
              members={members}
              onRemoveFilter={(key) => {
                if (key === 'tags') {
                  setFilters(prev => ({ ...prev, tags: [] }));
                } else if (key === 'hasValue') {
                  setFilters(prev => ({ ...prev, hasValue: null }));
                } else {
                  setFilters(prev => ({ ...prev, [key]: '' }));
                }
              }}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {viewMode === 'kanban' ? (
            <PipelineKanban 
              selectedPipelineId={selectedPipelineId}
              filters={filters}
              selectionMode={selectionMode}
              selectedLeads={selectedLeads}
              onSelectionChange={setSelectedLeads}
              onSelectionModeChange={setSelectionMode}
            />
          ) : (
            <PipelineListView 
              selectedPipelineId={selectedPipelineId}
              filters={filters}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
