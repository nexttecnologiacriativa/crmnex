
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Calendar, 
  Clock, 
  User, 
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useJobs, useDeleteJob } from '@/hooks/useJobs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EditJobDialog from './EditJobDialog';

interface JobsListViewProps {
  filters: {
    assignee: string;
    priority: string;
    search: string;
    tags: string[];
  };
  boardId?: string | null;
}

const statusLabels = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
};

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export default function JobsListView({ filters, boardId }: JobsListViewProps) {
  const { data: jobs = [], isLoading } = useJobs(boardId);
  const deleteJob = useDeleteJob();
  const [editingJob, setEditingJob] = useState<any>(null);

  // Aplicar filtros
  const filteredJobs = jobs.filter(job => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue"></div>
      </div>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Jobs</span>
            <Badge variant="outline">{filteredJobs.length} jobs</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{job.title}</div>
                      {job.description && (
                        <div className="text-sm text-gray-500 truncate max-w-[300px]">
                          {job.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={statusColors[job.status as keyof typeof statusColors]}
                    >
                      {statusLabels[job.status as keyof typeof statusLabels]}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={priorityColors[job.priority as keyof typeof priorityColors]}
                    >
                      {priorityLabels[job.priority as keyof typeof priorityLabels]}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {job.profiles?.full_name ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {job.profiles.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{job.profiles.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Não atribuído</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {job.due_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(job.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Sem prazo</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {job.estimated_hours ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {job.estimated_hours}h
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingJob(job)}>
                          <Edit className="h-3 w-3 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteJob.mutate(job.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum job encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingJob && (
        <EditJobDialog
          job={editingJob}
          open={!!editingJob}
          onOpenChange={() => setEditingJob(null)}
        />
      )}
    </>
  );
}
