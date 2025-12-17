
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useJobsByStatus, useUpdateJob, JobStatus } from '@/hooks/useJobs';
import { useJobCustomStatuses, useCreateJobCustomStatus, useDeleteJobCustomStatus, useUpdateJobCustomStatus } from '@/hooks/useJobCustomStatuses';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import JobCard from './JobCard';
import CreateJobDialog from './CreateJobDialog';
import EditJobStatusColumn from './EditJobStatusColumn';
import AddJobColumnDialog from './AddJobColumnDialog';

interface JobsKanbanProps {
  filters: {
    assignee: string;
    priority: string;
    search: string;
    tags: string[];
  };
  boardId?: string | null;
}

const initialStatusOrder: JobStatus[] = ['todo', 'in_progress', 'review', 'done'];

const statusLabels = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
};

const statusColors = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981',
};

export default function JobsKanban({ filters, boardId }: JobsKanbanProps) {
  const jobsByStatus = useJobsByStatus(boardId);
  const updateJob = useUpdateJob();
  const { data: customStatuses = [] } = useJobCustomStatuses();
  const createCustomStatus = useCreateJobCustomStatus();
  const updateCustomStatus = useUpdateJobCustomStatus();
  const deleteCustomStatus = useDeleteJobCustomStatus();
  const [createDialogStatus, setCreateDialogStatus] = useState<JobStatus | null>(null);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);

  // Combinar status padrão com customizados
  const allStatuses = useMemo(() => {
    const defaultStatuses = initialStatusOrder.map(status => ({
      id: status,
      label: statusLabels[status],
      color: statusColors[status],
      isCustom: false
    }));
    
    const customStatusesMapped = customStatuses.map(customStatus => ({
      id: customStatus.status_id,
      label: customStatus.status_label,
      color: customStatus.status_color,
      isCustom: true
    }));
    
    return [...defaultStatuses, ...customStatusesMapped];
  }, [customStatuses]);

  // Aplicar filtros para todos os jobs (incluindo customizados)
  const filteredJobs = useMemo(() => {
    const result: Record<string, any[]> = {};
    
    // Primeiro, processar os status padrão
    Object.entries(jobsByStatus).forEach(([status, jobs]) => {
      if (status === 'all') return; // Pular a propriedade 'all'
      
      result[status] = jobs.filter(job => {
        const matchesSearch = !filters.search || 
          job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          job.description?.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesAssignee = !filters.assignee || 
          job.assigned_to === filters.assignee;
        
        const matchesPriority = !filters.priority || 
          job.priority === filters.priority;

        const matchesTags = !filters.tags?.length || 
          filters.tags.some(tag => job.tags?.includes(tag));

        return matchesSearch && matchesAssignee && matchesPriority && matchesTags;
      });
    });
    
    // Para status customizados, buscar jobs com esses status nos jobs 'all'
    customStatuses.forEach(customStatus => {
      const customJobs = jobsByStatus.all.filter(job => 
        job.status === customStatus.status_id
      ).filter(job => {
        const matchesSearch = !filters.search || 
          job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          job.description?.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesAssignee = !filters.assignee || 
          job.assigned_to === filters.assignee;
        
        const matchesPriority = !filters.priority || 
          job.priority === filters.priority;

        const matchesTags = !filters.tags?.length || 
          filters.tags.some(tag => job.tags?.includes(tag));

        return matchesSearch && matchesAssignee && matchesPriority && matchesTags;
      });
      
      result[customStatus.status_id] = customJobs;
    });
    
    return result;
  }, [jobsByStatus, customStatuses, filters]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Drag de jobs
    const { draggableId } = result;
    const newStatus = destination.droppableId;

    await updateJob.mutateAsync({
      id: draggableId,
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    });
  };

  const handleCreateJob = (status: string) => {
    setCreateDialogStatus(status as JobStatus);
  };

  const handleAddColumn = async (label: string, color: string) => {
    const newStatusId = `custom_${Date.now()}`;
    
    await createCustomStatus.mutateAsync({
      status_id: newStatusId,
      status_label: label,
      status_color: color,
      position: allStatuses.length
    });
  };

  const handleEditColumn = async (statusId: string, newLabel: string) => {
    const statusInfo = allStatuses.find(s => s.id === statusId);
    if (!statusInfo) return;

    if (statusInfo.isCustom) {
      await updateCustomStatus.mutateAsync({
        statusId,
        status_label: newLabel
      });
    } else {
      toast.error('Não é possível editar colunas padrão');
    }
  };

  const handleDeleteColumn = async (statusId: string) => {
    const jobs = filteredJobs[statusId] || [];
    if (jobs.length > 0) {
      toast.error('Não é possível excluir uma coluna que contém jobs');
      return;
    }

    const statusInfo = allStatuses.find(s => s.id === statusId);
    if (!statusInfo) return;

    if (confirm(`Tem certeza que deseja excluir a coluna "${statusInfo.label}"?`)) {
      if (statusInfo.isCustom) {
        await deleteCustomStatus.mutateAsync(statusId);
      } else {
        toast.error('Não é possível excluir colunas padrão');
      }
    }
  };

  return (
    <div className="space-y-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea className="w-full">
          <div className="flex gap-6 pb-4" style={{ minWidth: `${allStatuses.length * 320 + 100}px` }}>
            {allStatuses.map((statusInfo, index) => {
              const jobs = filteredJobs[statusInfo.id] || [];
              const { id: status, label, color, isCustom } = statusInfo;
              
              return (
                <div key={status} className="w-80 flex-shrink-0 group">
                  <div className="min-h-[600px] bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="bg-gray-100 p-4 flex items-center justify-between mb-4 rounded-t-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <EditJobStatusColumn
                          status={status}
                          label={label}
                          color={color}
                          onSave={(newLabel) => handleEditColumn(status, newLabel)}
                          isCustom={isCustom}
                        />
                        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                          {jobs.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateJob(status)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        {isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteColumn(status)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-4 space-y-3 min-h-[500px] ${
                            snapshot.isDraggingOver ? 'bg-blue-50' : ''
                          }`}
                        >
                          {jobs.map((job, index) => (
                            <Draggable key={job.id} draggableId={job.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? 'rotate-2 shadow-2xl' : ''}
                                >
                                  <JobCard job={job} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {jobs.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <p className="text-sm">Nenhum job neste status</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
            
            <div className="w-80 flex-shrink-0">
              <Button
                variant="outline"
                className="w-full h-16 text-gray-500 border-2 border-dashed border-gray-300 hover:border-gray-400"
                onClick={() => setAddColumnDialogOpen(true)}
              >
                <Plus className="h-5 w-5 mr-2" />
                Nova Coluna
              </Button>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DragDropContext>

      <CreateJobDialog
        open={!!createDialogStatus}
        onOpenChange={(open) => !open && setCreateDialogStatus(null)}
        defaultStatus={createDialogStatus || 'todo'}
        defaultBoardId={boardId}
      />

      <AddJobColumnDialog
        open={addColumnDialogOpen}
        onOpenChange={setAddColumnDialogOpen}
        onSave={handleAddColumn}
      />
    </div>
  );
}
