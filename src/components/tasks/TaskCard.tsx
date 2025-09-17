
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, User, Edit, Trash2, CheckCircle, ExternalLink, Tag, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import EditTaskDialog from './EditTaskDialog';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface TaskCardProps {
  task: any;
  onEdit?: () => void;
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    pending: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em Progresso',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  };

  const handleToggleComplete = async () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask.mutateAsync({
      id: task.id,
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      setIsEditDialogOpen(true);
    }
  };

  const handleView = () => {
    navigate(`/tasks/${task.id}`);
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  // Check if lead has UTM data
  const hasUtmData = task.leads && (
    task.leads.utm_source || 
    task.leads.utm_medium || 
    task.leads.utm_campaign
  );

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${isOverdue ? 'border-red-200' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-medium cursor-pointer" onClick={handleView}>
              {task.title}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleView}
                className="text-blue-600"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleComplete}
                className={task.status === 'completed' ? 'text-green-600' : 'text-gray-400'}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge className={priorityColors[task.priority]}>
              {priorityLabels[task.priority]}
            </Badge>
            <Badge className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3" onClick={handleView}>
          {task.description && (
            <p className="text-sm text-gray-600">{task.description}</p>
          )}

          <div className="flex flex-col gap-2 text-sm text-gray-500">
            {task.due_date && (
              <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : ''}`}>
                <Calendar className="h-4 w-4" />
                <span>
                  Vence em {format(new Date(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            )}

            {task.profiles && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{task.profiles.full_name}</span>
              </div>
            )}

            {task.leads && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  <span className="font-medium text-blue-600">
                    Lead: {getLeadDisplayName(task.leads)}
                  </span>
                  {task.leads.company && (
                    <span className="text-gray-400">- {task.leads.company}</span>
                  )}
                </div>
                
                {hasUtmData && (
                  <div className="ml-6 p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="h-3 w-3" />
                      <span className="text-xs font-medium text-gray-700">Origem UTM:</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {task.leads.utm_source && (
                        <div><span className="font-medium">Source:</span> {task.leads.utm_source}</div>
                      )}
                      {task.leads.utm_medium && (
                        <div><span className="font-medium">Medium:</span> {task.leads.utm_medium}</div>
                      )}
                      {task.leads.utm_campaign && (
                        <div><span className="font-medium">Campaign:</span> {task.leads.utm_campaign}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditTaskDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
}
