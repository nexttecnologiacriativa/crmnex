import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, ChevronDown, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import LeadKanbanCard from './LeadKanbanCard';
import CreatePipelineStageDialog from './CreatePipelineStageDialog';
import EditPipelineStageDialog from './EditPipelineStageDialog';
import CreateLeadDialog from '../leads/CreateLeadDialog';
import BulkActionsPanel from './BulkActionsPanel';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useEnsureDefaultWorkspace } from '@/hooks/useWorkspace';
import { useDeletePipelineStage, useReorderPipelineStages } from '@/hooks/usePipeline';
import { useStagePagination } from '@/hooks/useStagePagination';
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime';
import { differenceInDays } from 'date-fns';

import { PipelineFiltersState } from './PipelineFilters';

interface PipelineKanbanProps {
  selectedPipelineId: string | null;
  filters: PipelineFiltersState;
  selectionMode?: boolean;
  selectedLeads?: string[];
  onSelectionChange?: (leads: string[]) => void;
  onSelectionModeChange?: (mode: boolean) => void;
}

// Função para mapear nome da etapa para status válido
const getStatusFromStageName = (stageName: string): "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost" => {
  const normalizedName = stageName.toLowerCase().replace(/\s+/g, '_');

  // Mapeamento de nomes comuns para status válidos
  const statusMap: {
    [key: string]: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  } = {
    'novo': 'new',
    'novo_lead': 'new',
    'contato': 'contacted',
    'contato_inicial': 'contacted',
    'contatado': 'contacted',
    'qualificado': 'qualified',
    'qualificação': 'qualified',
    'proposta': 'proposal',
    'negociação': 'negotiation',
    'negociacao': 'negotiation',
    'fechado': 'closed_won',
    'ganho': 'closed_won',
    'vencido': 'closed_won',
    'perdido': 'closed_lost',
    'perdeu': 'closed_lost'
  };
  return statusMap[normalizedName] || 'new';
};

export default function PipelineKanban({
  selectedPipelineId,
  filters,
  selectionMode = false,
  selectedLeads = [],
  onSelectionChange,
  onSelectionModeChange
}: PipelineKanbanProps) {
  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const { workspace } = useEnsureDefaultWorkspace();
  const deleteStage = useDeletePipelineStage();
  const reorderStages = useReorderPipelineStages();
  
  // Habilita atualização em tempo real dos leads
  useLeadsRealtime();
  
  const {
    data: stages,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['pipeline-stages', selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const {
        data,
        error
      } = await supabase.from('pipeline_stages').select('*').eq('pipeline_id', selectedPipelineId).order('position', {
        ascending: true
      });
      if (error) {
        console.error("Erro ao buscar etapas do pipeline:", error);
        toast.error("Erro ao buscar etapas do pipeline.");
      }
      return data || [];
    },
    enabled: !!selectedPipelineId
  });

  const { data: leads = [], refetch: refetchLeads } = useQuery({
    queryKey: ['pipeline-leads', selectedPipelineId, workspace?.id],
    queryFn: async () => {
      if (!selectedPipelineId || !workspace?.id) return [];
      
      // Buscar leads com JOIN direto na tabela de relações
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          profiles!leads_assigned_to_fkey (
            full_name,
            email
          ),
          pipeline_stages (
            name,
            color
          ),
          lead_pipeline_relations!inner (
            stage_id,
            pipeline_id
          ),
          whatsapp_conversations (
            profile_picture_url
          )
        `)
        .eq('workspace_id', workspace.id)
        .eq('lead_pipeline_relations.pipeline_id', selectedPipelineId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar leads do pipeline:", error);
        toast.error("Erro ao buscar leads do pipeline.");
        return [];
      }
      
      // Usar o stage_id da relação específica deste pipeline e extrair foto do WhatsApp
      return (data || []).map(lead => ({
        ...lead,
        stage_id: lead.lead_pipeline_relations?.[0]?.stage_id || lead.stage_id,
        profile_picture_url: lead.whatsapp_conversations?.[0]?.profile_picture_url || null
      }));
    },
    enabled: !!selectedPipelineId && !!workspace?.id
  });

  const leadsByStage = leads?.reduce((acc: Record<string, any[]>, lead: any) => {
    acc[lead.stage_id] = acc[lead.stage_id] || [];
    acc[lead.stage_id].push(lead);
    return acc;
  }, {});

  const { getVisibleLeads, loadMoreLeads, loadAllLeads, hasMoreLeads, resetPagination } = useStagePagination({ 
    leads: leads || [],
    leadsPerPage: 20 
  });

  // Refs para sincronização do scroll horizontal
  const topScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Calcular largura do conteúdo para a barra de scroll do topo
  const scrollContentWidth = useMemo(() => {
    const stageCount = stages?.length || 0;
    const stageWidth = 320; // w-80 = 20rem = 320px
    const gap = 24; // gap-6 = 1.5rem = 24px
    const extraButtonWidth = 320; // Botão "Nova Etapa"
    return (stageCount * stageWidth) + ((stageCount) * gap) + extraButtonWidth + 48; // padding extra
  }, [stages?.length]);

  // Sincronizar scroll da barra do topo com o conteúdo
  const handleTopScroll = useCallback(() => {
    if (topScrollRef.current && contentScrollRef.current) {
      contentScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }, []);

  const handleContentScroll = useCallback(() => {
    if (topScrollRef.current && contentScrollRef.current) {
      topScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft;
    }
  }, []);


  const handleDragEnd = async (result: any) => {
    const {
      destination,
      source,
      draggableId,
      type
    } = result;
    if (!destination) {
      return;
    }
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Handle stage reordering
    if (type === 'stage') {
      const newStages = Array.from(stages || []);
      const [reorderedStage] = newStages.splice(source.index, 1);
      newStages.splice(destination.index, 0, reorderedStage);
      const stageUpdates = newStages.map((stage, index) => ({
        id: stage.id,
        position: index
      }));
      try {
        await reorderStages.mutateAsync({
          stages: stageUpdates
        });
        refetch();
      } catch (error) {
        console.error("Erro ao reordenar etapas:", error);
        toast.error("Erro ao reordenar etapas.");
      }
      return;
    }

    // Handle lead drag between stages
    const lead = leads?.find((lead: any) => lead.id === draggableId);
    if (!lead) {
      toast.error("Lead não encontrado.");
      return;
    }
    const newStageId = destination.droppableId;
    const newStage = stages?.find(stage => stage.id === newStageId);
    if (!newStage) {
      toast.error("Etapa não encontrada.");
      return;
    }

    // Mapear o nome da etapa para um status válido
    const newStatus = getStatusFromStageName(newStage.name);
    
    // Determinar a tag baseada no nome da etapa
    let pipelineTag = 'aberto'; // tag padrão
    const stageNameLower = newStage.name.toLowerCase();
    
    if (stageNameLower.includes('fechado') || stageNameLower.includes('ganho') || stageNameLower.includes('vencido')) {
      pipelineTag = 'ganho';
    } else if (stageNameLower.includes('perdido') || stageNameLower.includes('perdeu')) {
      pipelineTag = 'perdido';
    }
    
    console.log('Movendo lead:', {
      leadId: draggableId,
      fromStage: source.droppableId,
      toStage: newStageId,
      stageName: newStage.name,
      oldStatus: lead.status,
      newStatus: newStatus,
      pipelineTag: pipelineTag
    });
    
    // Atualizar a relação do lead com este pipeline específico
    const { error: relationError } = await supabase
      .from('lead_pipeline_relations')
      .update({ stage_id: newStageId })
      .eq('lead_id', draggableId)
      .eq('pipeline_id', selectedPipelineId);

    if (relationError) {
      console.error("Erro ao atualizar relação do lead:", relationError);
      toast.error("Erro ao atualizar o lead.");
      return;
    }

    // Se este for o pipeline primário, atualizar também a tabela leads
    const { data: isPrimary } = await supabase
      .from('lead_pipeline_relations')
      .select('is_primary')
      .eq('lead_id', draggableId)
      .eq('pipeline_id', selectedPipelineId)
      .single();

    if (isPrimary?.is_primary) {
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          stage_id: newStageId,
          status: newStatus,
          pipeline_tag: pipelineTag
        })
        .eq('id', draggableId);

      if (leadError) {
        console.error("Erro ao atualizar o lead:", leadError);
        toast.error("Erro ao atualizar o lead.");
        return;
      }
    }

    // Mostrar toast com informações da mudança
    toast.success(`Lead movido para "${newStage.name}" com sucesso!`);
    refetchLeads();
  };

  const filteredLeads = (leads: any[]) => {
    return leads.filter(lead => {
      const leadDisplayName = lead.name || lead.email || '';
      const matchesSearch = !filters.search || 
        leadDisplayName.toLowerCase().includes(filters.search.toLowerCase()) || 
        lead.company?.toLowerCase().includes(filters.search.toLowerCase()) || 
        lead.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesSource = !filters.source || lead.source === filters.source;
      const matchesAssignee = !filters.assignee || lead.assigned_to === filters.assignee;
      const matchesPipelineTag = !filters.pipelineTag || lead.pipeline_tag === filters.pipelineTag;
      
      // Filtro de dias na etapa
      let matchesDaysInStage = true;
      if (filters.daysInStage) {
        const daysLimit = parseInt(filters.daysInStage);
        const stageDate = lead.pipeline_stage_updated_at || lead.updated_at || lead.created_at;
        if (stageDate) {
          const daysDiff = differenceInDays(new Date(), new Date(stageDate));
          matchesDaysInStage = daysDiff >= daysLimit;
        }
      }
      
      // Filtro de valor mínimo e máximo
      let matchesMinValue = true;
      let matchesMaxValue = true;
      if (filters.minValue) {
        matchesMinValue = (lead.value || 0) >= parseFloat(filters.minValue);
      }
      if (filters.maxValue) {
        matchesMaxValue = (lead.value || 0) <= parseFloat(filters.maxValue);
      }
      
      // Filtro de "tem valor"
      let matchesHasValue = true;
      if (filters.hasValue === true) {
        matchesHasValue = lead.value != null && lead.value > 0;
      }
      
      // Filtro de tags
      let matchesTags = true;
      if (filters.tags && filters.tags.length > 0) {
        const leadTagNames = lead.tags?.map((t: any) => t.name) || [];
        matchesTags = filters.tags.some(tag => leadTagNames.includes(tag));
      }
      
      return matchesSearch && matchesSource && matchesAssignee && matchesPipelineTag && 
             matchesDaysInStage && matchesMinValue && matchesMaxValue && matchesHasValue && matchesTags;
    });
  };

  const handleDeleteStage = async (stageId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta etapa? Todos os leads desta etapa serão movidos para a primeira etapa.')) {
      try {
        await deleteStage.mutateAsync(stageId);
        refetch();
      } catch (error) {
        console.error("Erro ao excluir etapa:", error);
        toast.error("Erro ao excluir etapa.");
      }
    }
  };

  const handleAddLead = () => {
    setIsCreateLeadOpen(true);
  };

  const handleLeadSelect = (leadId: string, selected: boolean) => {
    if (!onSelectionChange) return;
    if (selected) {
      onSelectionChange([...selectedLeads, leadId]);
    } else {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    }
  };

  const clearSelection = () => {
    onSelectionChange?.([]);
    onSelectionModeChange?.(false);
  };

  const selectAllLeadsInStage = (stageLeads: any[]) => {
    if (!onSelectionChange) return;
    const stageLeadIds = stageLeads.map(lead => lead.id);
    const allSelected = stageLeadIds.every(id => selectedLeads.includes(id));
    
    if (allSelected) {
      onSelectionChange(selectedLeads.filter(id => !stageLeadIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedLeads, ...stageLeadIds])]);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
      </div>;
  }

  if (!selectedPipelineId) {
    return <div className="flex items-center justify-center h-64 text-gray-500">
        Selecione um pipeline para visualizar os leads
      </div>;
  }

  return <div className="flex flex-col h-full">


      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Barra de scroll horizontal no TOPO */}
        <div 
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden h-3 min-h-[12px] mb-2"
        >
          <div style={{ width: scrollContentWidth, height: 1 }} />
        </div>
        
        {/* Conteúdo do Kanban */}
        <div 
          ref={contentScrollRef}
          onScroll={handleContentScroll}
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-none"
        >
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stages" direction="horizontal" type="stage">
              {provided => <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-6 h-full pb-4">
              {stages?.map((stage, index) => {
            const stageLeads = filteredLeads(leadsByStage?.[stage.id] || []);
            const visibleLeads = getVisibleLeads(stage.id, stageLeads);
            const showLoadMore = hasMoreLeads(stage.id, stageLeads);
            
            return <Draggable key={stage.id} draggableId={stage.id} index={index}>
                    {(provided, snapshot) => <div ref={provided.innerRef} {...provided.draggableProps} className={`flex-shrink-0 w-80 h-full group ${snapshot.isDragging ? 'rotate-2' : ''}`}>
                        <div className={`h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col`}>
                          <div {...provided.dragHandleProps} className="bg-gray-100 p-4 flex items-center justify-between rounded-t-lg cursor-move hover:bg-gray-200 transition-colors flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                              <div className="w-3 h-3 rounded-full" style={{
                        backgroundColor: stage.color || '#6b7280'
                      }} />
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-900 relative overflow-hidden">
                                  <span className="relative z-10 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
                                    {stage.name}
                                  </span>
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-blue-100 opacity-20 rounded animate-pulse"></div>
                                </h3>
                                <div className="text-xs text-gray-600 mt-1 my-[2px]">
                                  R$ {stageLeads.reduce((sum, lead) => sum + Math.max(lead.value || 0, 0), 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2
                          })}
                                </div>
                              </div>
                              <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                                {visibleLeads.length}{stageLeads.length > visibleLeads.length && `/${stageLeads.length}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {selectionMode && stageLeads.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectAllLeadsInStage(visibleLeads);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                >
                                  {visibleLeads.every(lead => selectedLeads.includes(lead.id)) ? 'Desmarcar' : 'Marcar'} Todos
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={e => {
                        e.stopPropagation();
                        handleAddLead();
                      }} className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0">
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={e => {
                        e.stopPropagation();
                        setEditingStage(stage);
                      }} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                                Editar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={e => {
                        e.stopPropagation();
                        handleDeleteStage(stage.id);
                      }} className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <Droppable droppableId={stage.id}>
                            {(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`p-4 space-y-3 flex-1 overflow-y-auto ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}>
                                {visibleLeads.map((lead, index) => <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                     {provided => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <LeadKanbanCard 
                                          lead={lead}
                                          selectionMode={selectionMode}
                                          isSelected={selectedLeads.includes(lead.id)}
                                          onSelect={handleLeadSelect}
                                        />
                                      </div>}
                                  </Draggable>)}
                                {provided.placeholder}
                                {showLoadMore && (
                                  <div className="flex flex-col gap-2 mt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => loadMoreLeads(stage.id)}
                                      className="w-full text-gray-500 hover:text-gray-700"
                                    >
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                      Carregar mais ({stageLeads.length - visibleLeads.length} restantes)
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => loadAllLeads(stage.id, stageLeads.length)}
                                      className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                    >
                                      <List className="h-4 w-4 mr-2" />
                                      Ver todos ({stageLeads.length})
                                    </Button>
                                  </div>
                                )}
                              </div>}
                          </Droppable>
                        </div>
                      </div>}
                  </Draggable>;
          })}
              {provided.placeholder}

              <div className="flex-shrink-0 w-80 h-full flex items-start pt-4">
                <Button variant="outline" className="w-full h-16 text-gray-500 border-2 border-dashed border-gray-300 hover:border-gray-400" onClick={() => setIsCreateStageOpen(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Nova Etapa
                </Button>
              </div>
            </div>}
          </Droppable>
        </DragDropContext>
        </div>
      </div>

      <CreatePipelineStageDialog open={isCreateStageOpen} onOpenChange={setIsCreateStageOpen} pipelineId={selectedPipelineId} nextPosition={stages?.length || 0} />

      {editingStage && <EditPipelineStageDialog open={!!editingStage} onOpenChange={open => !open && setEditingStage(null)} stage={editingStage} />}

      <CreateLeadDialog open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen} />

      <BulkActionsPanel
        selectedLeads={selectedLeads}
        onClearSelection={clearSelection}
        stages={stages || []}
        onRefetch={() => {
          refetch();
          refetchLeads();
        }}
      />
    </div>;
}