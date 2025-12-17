
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspaceMembers } from '@/hooks/useJobs';
import { getTagColorClasses } from '@/lib/tagColors';

interface JobsFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    assignee: string;
    priority: string;
    search: string;
    tags: string[];
  };
  onFiltersChange: (filters: any) => void;
  availableTags: string[];
}

export default function JobsFilters({ open, onOpenChange, filters, onFiltersChange, availableTags }: JobsFiltersProps) {
  const { data: workspaceMembers = [] } = useWorkspaceMembers();

  const updateFilter = (key: string, value: string | string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleTag = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    updateFilter('tags', newTags);
  };

  const clearFilters = () => {
    onFiltersChange({
      assignee: '',
      priority: '',
      search: '',
      tags: [],
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

          {availableTags.length > 0 && (
            <div>
              <Label>Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
                {availableTags.map((tag) => {
                  const colors = getTagColorClasses(tag);
                  const isSelected = (filters.tags || []).includes(tag);
                  return (
                    <div
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${
                        isSelected 
                          ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-purple-400` 
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Checkbox 
                        checked={isSelected}
                        className="h-3 w-3"
                        onCheckedChange={() => toggleTag(tag)}
                      />
                      <span className="text-xs font-medium">{tag}</span>
                    </div>
                  );
                })}
              </div>
              {(filters.tags || []).length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {filters.tags.length} tag(s) selecionada(s)
                </p>
              )}
            </div>
          )}

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
