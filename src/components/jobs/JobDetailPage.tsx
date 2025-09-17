
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Clock, 
  CheckSquare,
  History
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EditJobDialog from './EditJobDialog';
import JobSubtasksDialog from './JobSubtasksDialog';
import TimeTracker from './TimeTracker';
import JobSubtasksSection from './JobSubtasksSection';
import JobCommentsSection from './JobCommentsSection';
import { Job, useJobTimeLogs } from '@/hooks/useJobs';

const priorityColors = {
  low: 'bg-green-100 text-green-800',
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

const statusLabels = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubtasksDialogOpen, setIsSubtasksDialogOpen] = useState(false);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      if (!id) throw new Error('Job ID not found');
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          assigned_profile:profiles!jobs_assigned_to_fkey (
            full_name,
            email
          ),
          creator_profile:profiles!jobs_created_by_fkey (
            full_name,
            email
          ),
          job_boards (
            name,
            color
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Transform the data to match our Job interface
      const transformedData = {
        ...data,
        profiles: data.assigned_profile,
        creator: data.creator_profile,
      };
      
      return transformedData as Job & { job_boards?: { name: string; color: string } };
    },
    enabled: !!id,
  });

  const { data: timeLogs = [] } = useJobTimeLogs(id || '');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (hours: number) => {
    if (!hours || hours === 0) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const totalHours = timeLogs.reduce((sum, log) => sum + (log.hours || 0), 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    console.error('Error loading job:', error);
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900">Job não encontrado</h2>
          <p className="text-gray-600 mt-2">Ocorreu um erro ao carregar o job.</p>
          <Button onClick={() => navigate('/jobs')} className="mt-4">
            Voltar para Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isOverdue = job.due_date && new Date(job.due_date) < new Date() && job.status !== 'done';

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/jobs')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={priorityColors[job.priority]}>
                  {priorityLabels[job.priority]}
                </Badge>
                <Badge variant="outline">
                  {statusLabels[job.status]}
                </Badge>
                {job.job_boards && (
                  <Badge 
                    variant="outline"
                    style={{ borderColor: job.job_boards.color, color: job.job_boards.color }}
                  >
                    {job.job_boards.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TimeTracker jobId={job.id} />
            <Button
              variant="outline"
              onClick={() => setIsSubtasksDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Subtarefas
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {job.description || 'Nenhuma descrição fornecida.'}
                </p>
              </CardContent>
            </Card>

            <JobSubtasksSection job={job} />

            <Tabs defaultValue="comments" className="w-full">
              <TabsList>
                <TabsTrigger value="comments">Comentários</TabsTrigger>
                <TabsTrigger value="time-logs">Registros de Tempo</TabsTrigger>
              </TabsList>
              <TabsContent value="comments">
                <JobCommentsSection jobId={job.id} />
              </TabsContent>
              <TabsContent value="time-logs">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Registros de Tempo
                      <Badge variant="outline">{formatDuration(totalHours)}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timeLogs.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Nenhum registro de tempo encontrado.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {timeLogs.map((log) => (
                          <div key={log.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="h-4 w-4" />
                                  {formatDate(log.start_time)}
                                  {log.end_time && ` - ${formatDate(log.end_time)}`}
                                </div>
                                {log.hours && (
                                  <div className="font-medium text-green-600 mt-1">
                                    {formatDuration(log.hours)}
                                  </div>
                                )}
                                {log.description && (
                                  <p className="text-gray-700 mt-2">{log.description}</p>
                                )}
                              </div>
                              {!log.end_time && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Em andamento
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Job</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.assigned_to && job.profiles && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{job.profiles.full_name || 'Usuário'}</p>
                      <p className="text-sm text-gray-500">Responsável</p>
                    </div>
                  </div>
                )}

                {job.creator && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{job.creator.full_name || 'Usuário'}</p>
                      <p className="text-sm text-gray-500">Criado por</p>
                    </div>
                  </div>
                )}

                {job.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                        {formatDate(job.due_date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isOverdue ? 'Atrasado' : 'Prazo'}
                      </p>
                    </div>
                  </div>
                )}

                {job.estimated_hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{job.estimated_hours}h</p>
                      <p className="text-sm text-gray-500">Tempo estimado</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{formatDuration(totalHours)}</p>
                    <p className="text-sm text-gray-500">Tempo trabalhado</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{formatDate(job.created_at)}</p>
                    <p className="text-sm text-gray-500">Criado em</p>
                  </div>
                </div>

                {job.completed_at && (
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{formatDate(job.completed_at)}</p>
                      <p className="text-sm text-gray-500">Concluído em</p>
                    </div>
                  </div>
                )}

                {job.tags && job.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {job.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <EditJobDialog
          job={job}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />

        <JobSubtasksDialog
          job={job}
          open={isSubtasksDialogOpen}
          onOpenChange={setIsSubtasksDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
