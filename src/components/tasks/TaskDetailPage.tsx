
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Clock, 
  Building,
  Tag,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useUpdateTask } from '@/hooks/useTasks';
import EditTaskDialog from './EditTaskDialog';
import { getLeadDisplayName } from '@/lib/leadUtils';

interface TaskWithRelations {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  leads?: {
    name: string;
    email?: string;
    company?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

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

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const updateTask = useUpdateTask();

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: async (): Promise<TaskWithRelations> => {
      if (!id) throw new Error('Task ID not found');
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:profiles!tasks_assigned_to_fkey (
            full_name,
            email
          ),
          leads (
            name,
            email,
            company,
            utm_source,
            utm_medium,
            utm_campaign
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TaskWithRelations;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (task) {
      setNotes(task.description || '');
    }
  }, [task]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleToggleComplete = async () => {
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask.mutateAsync({
      id: task.id,
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const handleUpdateNotes = async () => {
    if (!task || notes === task.description) {
      setShowNotes(false);
      return;
    }
    
    setIsUpdatingNotes(true);
    try {
      await updateTask.mutateAsync({
        id: task.id,
        description: notes,
      });
      setShowNotes(false);
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !task) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900">Tarefa não encontrada</h2>
          <p className="text-gray-600 mt-2">Ocorreu um erro ao carregar a tarefa.</p>
          <Button onClick={() => navigate('/tasks')} className="mt-4">
            Voltar para Tarefas
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const hasUtmData = task.leads && (
    task.leads.utm_source || 
    task.leads.utm_medium || 
    task.leads.utm_campaign
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={priorityColors[task.priority]}>
                  {priorityLabels[task.priority]}
                </Badge>
                <Badge className={statusColors[task.status]}>
                  {statusLabels[task.status]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {showNotes ? 'Fechar Anotações' : 'Anotações'}
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleComplete}
              className={`flex items-center gap-2 ${
                task.status === 'completed' ? 'text-green-600 border-green-600' : 'text-gray-600'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              {task.status === 'completed' ? 'Reabrir' : 'Concluir'}
            </Button>
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>

        {showNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Anotações da Tarefa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione uma anotação para esta tarefa..."
                className="min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateNotes}
                  disabled={isUpdatingNotes}
                >
                  {isUpdatingNotes ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNotes(task.description || '');
                    setShowNotes(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {task.description || 'Nenhuma descrição fornecida.'}
                </p>
              </CardContent>
            </Card>

            {task.leads && hasUtmData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Dados UTM do Lead
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.leads.utm_source && (
                    <div>
                      <span className="font-medium text-gray-700">Source:</span>
                      <span className="ml-2 text-gray-600">{task.leads.utm_source}</span>
                    </div>
                  )}
                  {task.leads.utm_medium && (
                    <div>
                      <span className="font-medium text-gray-700">Medium:</span>
                      <span className="ml-2 text-gray-600">{task.leads.utm_medium}</span>
                    </div>
                  )}
                  {task.leads.utm_campaign && (
                    <div>
                      <span className="font-medium text-gray-700">Campaign:</span>
                      <span className="ml-2 text-gray-600">{task.leads.utm_campaign}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Tarefa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.profiles && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{task.profiles.full_name}</p>
                      <p className="text-sm text-gray-500">Responsável</p>
                    </div>
                  </div>
                )}

                {task.leads && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{getLeadDisplayName(task.leads)}</p>
                      {task.leads.company && (
                        <p className="text-sm text-gray-500">{task.leads.company}</p>
                      )}
                      <p className="text-sm text-gray-500">Lead relacionado</p>
                    </div>
                  </div>
                )}

                {task.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                        {formatDate(task.due_date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isOverdue ? 'Atrasado' : 'Prazo'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{formatDate(task.created_at)}</p>
                    <p className="text-sm text-gray-500">Criado em</p>
                  </div>
                </div>

                {task.completed_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{formatDate(task.completed_at)}</p>
                      <p className="text-sm text-gray-500">Concluído em</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <EditTaskDialog
          task={task}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
