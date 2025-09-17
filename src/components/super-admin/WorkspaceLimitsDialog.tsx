
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WorkspaceLimitsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (limits: { maxLeads: number | null; maxTasks: number | null; maxJobs: number | null }) => void;
  currentLimits?: {
    max_leads: number | null;
    max_tasks: number | null;
    max_jobs: number | null;
  };
  workspaceName: string;
  usage?: {
    leads_count: number;
    tasks_count: number;
    jobs_count: number;
  };
  isLoading: boolean;
}

export default function WorkspaceLimitsDialog({
  isOpen,
  onClose,
  onSave,
  currentLimits,
  workspaceName,
  usage,
  isLoading
}: WorkspaceLimitsDialogProps) {
  const [maxLeads, setMaxLeads] = useState(currentLimits?.max_leads?.toString() || '');
  const [maxTasks, setMaxTasks] = useState(currentLimits?.max_tasks?.toString() || '');
  const [maxJobs, setMaxJobs] = useState(currentLimits?.max_jobs?.toString() || '');

  const handleSave = () => {
    onSave({
      maxLeads: maxLeads ? parseInt(maxLeads) : null,
      maxTasks: maxTasks ? parseInt(maxTasks) : null,
      maxJobs: maxJobs ? parseInt(maxJobs) : null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Limites de Uso</DialogTitle>
          <DialogDescription>
            Configure os limites máximos para "{workspaceName}". Deixe vazio para ilimitado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {usage && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Uso Atual:</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Leads:</span>
                  <div className="font-medium">{usage.leads_count}</div>
                </div>
                <div>
                  <span className="text-gray-600">Tarefas:</span>
                  <div className="font-medium">{usage.tasks_count}</div>
                </div>
                <div>
                  <span className="text-gray-600">Jobs:</span>
                  <div className="font-medium">{usage.jobs_count}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="maxLeads">Limite de Leads</Label>
              <Input
                id="maxLeads"
                type="number"
                min="0"
                placeholder="Sem limite"
                value={maxLeads}
                onChange={(e) => setMaxLeads(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="maxTasks">Limite de Tarefas</Label>
              <Input
                id="maxTasks"
                type="number"
                min="0"
                placeholder="Sem limite"
                value={maxTasks}
                onChange={(e) => setMaxTasks(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="maxJobs">Limite de Jobs</Label>
              <Input
                id="maxJobs"
                type="number"
                min="0"
                placeholder="Sem limite"
                value={maxJobs}
                onChange={(e) => setMaxJobs(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Limites'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
