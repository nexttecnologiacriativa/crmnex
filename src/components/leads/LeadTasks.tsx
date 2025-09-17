import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Eye, Plus, Edit } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import CreateTaskFromLeadDialog from '../tasks/CreateTaskFromLeadDialog';
import EditTaskDialog from '../tasks/EditTaskDialog';

interface LeadTasksProps {
  leadId: string;
  leadName: string;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const taskStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const taskStatusLabels = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export default function LeadTasks({ leadId, leadName }: LeadTasksProps) {
  const navigate = useNavigate();
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const { data: allTasks = [] } = useTasks();

  // Filtrar tarefas relacionadas ao lead
  const leadTasks = allTasks.filter(task => task.lead_id === leadId);
  const activeTasks = leadTasks.filter(task => task.status !== 'completed');
  const completedTasks = leadTasks.filter(task => task.status === 'completed');

  const handleViewTask = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setIsEditTaskDialogOpen(true);
  };

  if (leadTasks.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-premium-blue flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tarefas
            </CardTitle>
            <Button
              onClick={() => setIsCreateTaskDialogOpen(true)}
              size="sm"
              className="gradient-premium text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-gray-500 mb-4">Este lead ainda não possui tarefas associadas.</p>
            <Button
              onClick={() => setIsCreateTaskDialogOpen(true)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira tarefa
            </Button>
          </div>
        </CardContent>

        <CreateTaskFromLeadDialog
          open={isCreateTaskDialogOpen}
          onOpenChange={setIsCreateTaskDialogOpen}
          lead={{ id: leadId, name: leadName }}
        />
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-premium-blue flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tarefas ({leadTasks.length})
          </CardTitle>
          <Button
            onClick={() => setIsCreateTaskDialogOpen(true)}
            size="sm"
            className="gradient-premium text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {activeTasks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Tarefas Ativas ({activeTasks.length})</h4>
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{task.title}</h5>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEditTask(task)}
                          size="sm"
                          variant="ghost"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleViewTask(task.id)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={taskStatusColors[task.status]}>
                        {taskStatusLabels[task.status]}
                      </Badge>
                      <Badge className={priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {task.due_date && (
                        <span>
                          Vencimento: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {task.profiles && (
                        <span>
                          Responsável: {task.profiles.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Tarefas Concluídas ({completedTasks.length})</h4>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 bg-gray-50 opacity-75">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-700">{task.title}</h5>
                      <div className="flex items-center">
                        <Button
                          onClick={() => handleEditTask(task)}
                          size="sm"
                          variant="ghost"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleViewTask(task.id)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={taskStatusColors[task.status]}>
                        {taskStatusLabels[task.status]}
                      </Badge>
                      <Badge className={priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {task.completed_at && (
                        <span>
                          Concluída em: {new Date(task.completed_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {task.profiles && (
                        <span>
                          Responsável: {task.profiles.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CreateTaskFromLeadDialog
        open={isCreateTaskDialogOpen}
        onOpenChange={setIsCreateTaskDialogOpen}
        lead={{ id: leadId, name: leadName }}
      />

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isEditTaskDialogOpen}
          onOpenChange={setIsEditTaskDialogOpen}
        />
      )}
    </Card>
  );
}
