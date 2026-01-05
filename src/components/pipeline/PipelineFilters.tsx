import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useLeadTags } from '@/hooks/useLeadTags';

export interface PipelineFiltersState {
  search: string;
  daysInStage: string;
  minValue: string;
  maxValue: string;
  hasValue: boolean | null;
  assignee: string;
  source: string;
  pipelineTag: string;
  tags: string[];
}

export const defaultFilters: PipelineFiltersState = {
  search: '',
  daysInStage: '',
  minValue: '',
  maxValue: '',
  hasValue: null,
  assignee: '',
  source: '',
  pipelineTag: '',
  tags: [],
};

interface PipelineFiltersProps {
  filters: PipelineFiltersState;
  onFiltersChange: (filters: PipelineFiltersState) => void;
}

const DAYS_OPTIONS = [
  { value: '3', label: '> 3 dias' },
  { value: '7', label: '> 7 dias' },
  { value: '10', label: '> 10 dias' },
  { value: '15', label: '> 15 dias' },
  { value: '30', label: '> 30 dias' },
];

const SOURCE_OPTIONS = [
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site', label: 'Site' },
  { value: 'outro', label: 'Outro' },
];

const PIPELINE_TAG_OPTIONS = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'ganho', label: 'Ganho' },
  { value: 'perdido', label: 'Perdido' },
];

export function PipelineFilters({ filters, onFiltersChange }: PipelineFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<PipelineFiltersState>(filters);
  
  const { members = [] } = useTeamManagement();
  const { data: tags = [] } = useLeadTags();

  const activeFiltersCount = countActiveFilters(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const updateFilter = <K extends keyof PipelineFiltersState>(
    key: K,
    value: PipelineFiltersState[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tagName: string) => {
    setLocalFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Limpar tudo
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Busca */}
          <div className="space-y-2">
            <Label>Buscar</Label>
            <Input
              placeholder="Nome, email, telefone, empresa..."
              value={localFilters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Dias na Etapa e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dias na Etapa</Label>
              <Select
                value={localFilters.daysInStage}
                onValueChange={(value) => updateFilter('daysInStage', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status do Pipeline</Label>
              <Select
                value={localFilters.pipelineTag}
                onValueChange={(value) => updateFilter('pipelineTag', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_TAG_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor do Lead */}
          <div className="space-y-2">
            <Label>Valor do Lead (R$)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Mínimo"
                value={localFilters.minValue}
                onChange={(e) => updateFilter('minValue', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Máximo"
                value={localFilters.maxValue}
                onChange={(e) => updateFilter('maxValue', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="hasValue"
                checked={localFilters.hasValue === true}
                onCheckedChange={(checked) => 
                  updateFilter('hasValue', checked ? true : null)
                }
              />
              <label htmlFor="hasValue" className="text-sm text-muted-foreground">
                Apenas leads com valor definido
              </label>
            </div>
          </div>

          {/* Responsável e Fonte */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={localFilters.assignee}
                onValueChange={(value) => updateFilter('assignee', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.profiles?.full_name || member.profiles?.email || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select
                value={localFilters.source}
                onValueChange={(value) => updateFilter('source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={localFilters.tags.includes(tag.name) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    style={{
                      backgroundColor: localFilters.tags.includes(tag.name) ? tag.color : 'transparent',
                      borderColor: tag.color,
                      color: localFilters.tags.includes(tag.name) ? 'white' : tag.color,
                    }}
                    onClick={() => toggleTag(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function countActiveFilters(filters: PipelineFiltersState): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.daysInStage) count++;
  if (filters.minValue) count++;
  if (filters.maxValue) count++;
  if (filters.hasValue !== null) count++;
  if (filters.assignee) count++;
  if (filters.source) count++;
  if (filters.pipelineTag) count++;
  if (filters.tags.length > 0) count++;
  return count;
}

interface ActiveFilterBadgesProps {
  filters: PipelineFiltersState;
  onRemoveFilter: (key: keyof PipelineFiltersState) => void;
  members?: Array<{ user_id: string; profiles?: { full_name?: string; email?: string } }>;
}

export function ActiveFilterBadges({ filters, onRemoveFilter, members = [] }: ActiveFilterBadgesProps) {
  const badges: Array<{ key: keyof PipelineFiltersState; label: string }> = [];

  if (filters.daysInStage) {
    badges.push({ key: 'daysInStage', label: `> ${filters.daysInStage} dias` });
  }
  if (filters.minValue) {
    badges.push({ key: 'minValue', label: `R$ ${filters.minValue}+` });
  }
  if (filters.maxValue) {
    badges.push({ key: 'maxValue', label: `Até R$ ${filters.maxValue}` });
  }
  if (filters.hasValue === true) {
    badges.push({ key: 'hasValue', label: 'Com valor' });
  }
  if (filters.assignee) {
    const member = members.find(m => m.user_id === filters.assignee);
    badges.push({ 
      key: 'assignee', 
      label: `Resp: ${member?.profiles?.full_name || 'Selecionado'}` 
    });
  }
  if (filters.source) {
    const sourceLabel = SOURCE_OPTIONS.find(s => s.value === filters.source)?.label || filters.source;
    badges.push({ key: 'source', label: `Fonte: ${sourceLabel}` });
  }
  if (filters.pipelineTag) {
    const tagLabel = PIPELINE_TAG_OPTIONS.find(t => t.value === filters.pipelineTag)?.label || filters.pipelineTag;
    badges.push({ key: 'pipelineTag', label: `Status: ${tagLabel}` });
  }
  if (filters.tags.length > 0) {
    badges.push({ key: 'tags', label: `Tags: ${filters.tags.join(', ')}` });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(badge => (
        <Badge
          key={badge.key}
          variant="secondary"
          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
          onClick={() => onRemoveFilter(badge.key)}
        >
          {badge.label}
          <X className="h-3 w-3 ml-1" />
        </Badge>
      ))}
    </div>
  );
}
