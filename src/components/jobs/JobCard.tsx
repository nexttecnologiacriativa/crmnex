import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  User, 
  Clock, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  CheckSquare,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Job, useDeleteJob, useJobSubtasks } from '@/hooks/useJobs';
import EditJobDialog from './EditJobDialog';
import JobSubtasksDialog from './JobSubtasksDialog';
import TimeTracker from './TimeTracker';
import { getTagColorClasses } from '@/lib/tagColors';

interface JobCardProps {
  job: Job;
}

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

export default function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubtasksDialogOpen, setIsSubtasksDialogOpen] = useState(false);
  const deleteJob = useDeleteJob();
  const { data: subtasks = [] } = useJobSubtasks(job.id);
  
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const totalSubtasks = subtasks.length;

  const handleDelete = async () => {
    await deleteJob.mutateAsync(job.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const isOverdue = job.due_date && new Date(job.due_date) < new Date() && job.status !== 'done';

  const handleCardClick = (e: React.MouseEvent) => {
    // Não navegar se o clique foi em um botão ou dropdown
    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) {
      return;
    }
    navigate(`/jobs/${job.id}`);
  };

  return (
    <>
      <Card 
        className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-sm text-gray-900 truncate">{job.title}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                  <Eye className="h-3 w-3 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="h-3 w-3 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsSubtasksDialogOpen(true)}>
                  <CheckSquare className="h-3 w-3 mr-2" />
                  Subtarefas
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="h-3 w-3 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Job</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este job? Esta ação não pode ser desfeita.
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Badge className={priorityColors[job.priority]} variant="secondary">
            {priorityLabels[job.priority]}
          </Badge>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          {job.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{job.description}</p>
          )}

          {job.tags && job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.tags.map((tag) => {
                const colors = getTagColorClasses(tag);
                return (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className={`text-xs ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="space-y-1">
            {job.assigned_to && job.profiles && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <User className="h-3 w-3" />
                <span className="truncate">{job.profiles.full_name || 'Usuário'}</span>
              </div>
            )}

            {job.due_date && (
              <div className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-600' : 'text-gray-600'
              }`}>
                <Calendar className="h-3 w-3" />
                <span>{formatDate(job.due_date)}</span>
              </div>
            )}

            {totalSubtasks > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <CheckSquare className="h-3 w-3" />
                <span>{completedSubtasks}/{totalSubtasks} subtarefas</span>
              </div>
            )}

            {job.estimated_hours && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>{job.estimated_hours}h estimadas</span>
                </div>
                <TimeTracker jobId={job.id} variant="simple" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}
