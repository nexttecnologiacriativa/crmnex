
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, User, Edit, AlertCircle, Building, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  profiles?: {
    full_name: string;
  };
  leads?: {
    name: string;
    email?: string;
  };
}

interface TasksListViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

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

export default function TasksListView({ tasks, onEditTask }: TasksListViewProps) {
  const navigate = useNavigate();

  const handleViewTask = (task: Task) => {
    navigate(`/tasks/${task.id}`);
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou criar uma nova tarefa.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-gray-600 mb-3">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {task.status && (
                    <Badge className={statusColors[task.status]}>
                      {statusLabels[task.status]}
                    </Badge>
                  )}
                  {task.priority && (
                    <Badge className={priorityColors[task.priority]}>
                      {priorityLabels[task.priority]}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(task.due_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}

                  {task.profiles && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {task.profiles.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{task.profiles.full_name}</span>
                    </div>
                  )}

                  {task.leads && (
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>{getLeadDisplayName(task.leads)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewTask(task)}
                  className="text-blue-600"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditTask(task)}
                  className="shrink-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
