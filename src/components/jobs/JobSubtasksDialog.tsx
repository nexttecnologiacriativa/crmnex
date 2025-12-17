
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { Job, useJobSubtasks, useCreateJobSubtask, useUpdateJobSubtask, useDeleteJobSubtask } from '@/hooks/useJobs';

interface JobSubtasksDialogProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function JobSubtasksDialog({ job, open, onOpenChange }: JobSubtasksDialogProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const { data: subtasksData = [] } = useJobSubtasks(job.id);
  const createSubtask = useCreateJobSubtask();
  const updateSubtask = useUpdateJobSubtask();
  const deleteSubtask = useDeleteJobSubtask();

  // Ordenar subtarefas por data de criação (mais recentes primeiro)
  const subtasks = [...subtasksData].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    
    await createSubtask.mutateAsync({
      job_id: job.id,
      title: newSubtaskTitle.trim(),
      completed: false,
    });
    
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    await updateSubtask.mutateAsync({
      id: subtaskId,
      job_id: job.id,
      completed,
    });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await deleteSubtask.mutateAsync({
      id: subtaskId,
      job_id: job.id,
    });
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const progressPercentage = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subtarefas - {job.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{completedCount}/{subtasks.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Add new subtask */}
          <div className="flex gap-2">
            <Input
              placeholder="Nova subtarefa..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateSubtask();
                }
              }}
            />
            <Button 
              onClick={handleCreateSubtask}
              disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Subtasks list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2 p-2 border rounded">
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={(checked) => 
                    handleToggleSubtask(subtask.id, checked as boolean)
                  }
                />
                <span 
                  className={`flex-1 text-sm ${
                    subtask.completed ? 'line-through text-gray-500' : ''
                  }`}
                >
                  {subtask.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            {subtasks.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                Nenhuma subtarefa criada ainda
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
