
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceMembers } from '@/hooks/useJobs';

interface JobsFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    assignee: string;
    priority: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
}

export default function JobsFilters({ open, onOpenChange, filters, onFiltersChange }: JobsFiltersProps) {
  const { data: workspaceMembers = [] } = useWorkspaceMembers();

  const updateFilter = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      assignee: '',
      priority: '',
      search: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Buscar por título ou descrição..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="assignee">Responsável</Label>
            <select
              id="assignee"
              value={filters.assignee}
              onChange={(e) => updateFilter('assignee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Todos os responsáveis</option>
              {workspaceMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="priority">Prioridade</Label>
            <select
              id="priority"
              value={filters.priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Todas as prioridades</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
