import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Tag, ArrowRight, Loader2 } from 'lucide-react';
import { useLeadTags } from '@/hooks/useLeadTags';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from '@/hooks/useWorkspace';

interface BulkActionsPanelProps {
  selectedLeads: string[];
  onClearSelection: () => void;
  stages: any[];
  onRefetch: () => void;
}

export default function BulkActionsPanel({ 
  selectedLeads, 
  onClearSelection, 
  stages,
  onRefetch 
}: BulkActionsPanelProps) {
  const [isAddingTags, setIsAddingTags] = useState(false);
  const [isMovingStage, setIsMovingStage] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  
  const { data: tags = [] } = useLeadTags();
  const { currentWorkspace } = useWorkspace();

  if (selectedLeads.length === 0) return null;

  const handleAddTagsToLeads = async () => {
    if (!selectedTag) return;
    
    setIsAddingTags(true);
    try {
      // Adicionar tag a todos os leads selecionados
      const tagRelations = selectedLeads.map(leadId => ({
        lead_id: leadId,
        tag_id: selectedTag
      }));

      const { error } = await supabase
        .from('lead_tag_relations')
        .upsert(tagRelations, { onConflict: 'lead_id,tag_id' });

      if (error) throw error;

      // Disparar automação para cada lead/tag
      try {
        if (currentWorkspace?.id) {
          await Promise.all(
            selectedLeads.map((leadId) =>
              supabase.functions.invoke('automation-engine', {
                body: {
                  action: 'process_tag_applied',
                  lead_id: leadId,
                  tag_id: selectedTag,
                  workspace_id: currentWorkspace.id,
                },
              })
            )
          );
        }
      } catch (invokeErr) {
        console.warn('Falha ao acionar automação em massa (tag_applied):', invokeErr);
      }

      toast.success(`Tag adicionada a ${selectedLeads.length} leads`);
      setSelectedTag('');
      onClearSelection();
      onRefetch();
    } catch (error) {
      console.error('Erro ao adicionar tags:', error);
      toast.error('Erro ao adicionar tags aos leads');
    } finally {
      setIsAddingTags(false);
    }
  };

  const handleMoveLeadsToStage = async () => {
    if (!selectedStage) return;
    
    setIsMovingStage(true);
    try {
      // Mover todos os leads selecionados para o estágio
      const { error } = await supabase
        .from('leads')
        .update({ stage_id: selectedStage })
        .in('id', selectedLeads);

      if (error) throw error;

      toast.success(`${selectedLeads.length} leads movidos para nova etapa`);
      setSelectedStage('');
      onClearSelection();
      onRefetch();
    } catch (error) {
      console.error('Erro ao mover leads:', error);
      toast.error('Erro ao mover leads');
    } finally {
      setIsMovingStage(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedLeads.length} leads selecionados
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Adicionar Tags */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Tag className="h-4 w-4 mr-2" />
              Adicionar Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-medium">Adicionar tag aos leads selecionados</h4>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddTagsToLeads}
                disabled={!selectedTag || isAddingTags}
                className="w-full"
                size="sm"
              >
                {isAddingTags ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4 mr-2" />
                )}
                Adicionar Tag
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Mover para Etapa */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4 mr-2" />
              Mover para Etapa
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-medium">Mover leads para etapa</h4>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleMoveLeadsToStage}
                disabled={!selectedStage || isMovingStage}
                className="w-full"
                size="sm"
              >
                {isMovingStage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Mover Leads
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}