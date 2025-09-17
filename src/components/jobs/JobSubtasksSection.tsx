
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Calendar,
  User
} from 'lucide-react';
import { 
  Job, 
  useJobSubtasks, 
  useCreateJobSubtask, 
  useUpdateJobSubtask, 
  useDeleteJobSubtask,
  useWorkspaceMembers 
} from '@/hooks/useJobs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface JobSubtasksSectionProps {
  job: Job;
}

export default function JobSubtasksSection({ job }: JobSubtasksSectionProps) {
  const { data: subtasks = [] } = useJobSubtasks(job.id);
  const { data: workspaceMembers = [] } = useWorkspaceMembers();
  const createSubtask = useCreateJobSubtask();
  const updateSubtask = useUpdateJobSubtask();
  const deleteSubtask = useDeleteJobSubtask();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('none');
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAssignee, setEditAssignee] = useState('none');

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    await createSubtask.mutateAsync({
      job_id: job.id,
      title: newSubtaskTitle,
      completed: false,
      due_date: newSubtaskDueDate || null,
      assigned_to: newSubtaskAssignee === 'none' ? null : newSubtaskAssignee,
    });

    setNewSubtaskTitle('');
    setNewSubtaskDueDate('');
    setNewSubtaskAssignee('none');
    setIsAddingNew(false);
  };

  const handleToggleComplete = async (subtask: any) => {
    const isCompleted = !subtask.completed;
    await updateSubtask.mutateAsync({
      id: subtask.id,
      job_id: subtask.job_id,
      completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    });
  };

  const handleStartEdit = (subtask: any) => {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
    setEditDueDate(subtask.due_date ? new Date(subtask.due_date).toISOString().slice(0, 16) : '');
    setEditAssignee(subtask.assigned_to || 'none');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editingId) return;

    await updateSubtask.mutateAsync({
      id: editingId,
      job_id: job.id,
      title: editTitle,
      due_date: editDueDate || null,
      assigned_to: editAssignee === 'none' ? null : editAssignee,
    });

    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditAssignee('none');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditAssignee('none');
  };

  const handleDelete = async (subtaskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta subtarefa?')) {
      await deleteSubtask.mutateAsync({ id: subtaskId, job_id: job.id });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const getMemberName = (memberId: string) => {
    const member = workspaceMembers.find(m => m.id === memberId);
    return member?.full_name || 'Usuário';
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Subtarefas
            {totalCount > 0 && (
              <Badge variant="outline">
                {completedCount}/{totalCount}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {subtasks.length === 0 && !isAddingNew && (
          <p className="text-gray-500 text-center py-4">
            Nenhuma subtarefa adicionada.
          </p>
        )}

        {subtasks.map((subtask) => (
          <div key={subtask.id} className="border rounded-lg p-3 space-y-2">
            {editingId === subtask.id ? (
              <div className="space-y-3">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título da subtarefa"
                  className="font-medium"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Data de vencimento</label>
                    <Input
                      type="datetime-local"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Responsável</label>
                    <Select value={editAssignee} onValueChange={setEditAssignee}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecionar responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não atribuído</SelectItem>
                        {workspaceMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim()}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => handleToggleComplete(subtask)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                      {subtask.title}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {subtask.due_date && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(subtask.due_date)}</span>
                        </div>
                      )}
                      
                      {subtask.assigned_to && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          <span>{getMemberName(subtask.assigned_to)}</span>
                        </div>
                      )}
                      
                      {subtask.completed && subtask.completed_at && (
                        <Badge variant="secondary" className="text-xs">
                          Concluído em {formatDate(subtask.completed_at)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(subtask)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(subtask.id)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isAddingNew && (
          <div className="border border-dashed rounded-lg p-3 space-y-3">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Título da subtarefa"
              className="font-medium"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateSubtask();
                }
              }}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data de vencimento</label>
                <Input
                  type="datetime-local"
                  value={newSubtaskDueDate}
                  onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Responsável</label>
                <Select value={newSubtaskAssignee} onValueChange={setNewSubtaskAssignee}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {workspaceMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewSubtaskTitle('');
                  setNewSubtaskDueDate('');
                  setNewSubtaskAssignee('none');
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCreateSubtask}
                disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
              >
                <Plus className="h-3 w-3 mr-1" />
                {createSubtask.isPending ? 'Criando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
