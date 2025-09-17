import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateLead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface PipelineTagSelectorProps {
  leadId: string;
  currentTag: string | null;
  onTagChange?: (newTag: string) => void;
}

const tagConfig = {
  aberto: { label: 'Aberto', color: '#3b82f6' },
  ganho: { label: 'Ganho', color: '#10b981' },
  perdido: { label: 'Perdido', color: '#ef4444' }
};

export default function PipelineTagSelector({ leadId, currentTag, onTagChange }: PipelineTagSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateLead = useUpdateLead();
  const queryClient = useQueryClient();
  
  const handleTagChange = async (newTag: string) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      // Lógica especial para tags ganho e perdido
      if (newTag === 'ganho') {
        // Mover para etapa "Fechado" e atualizar status
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('id, pipeline_id')
          .ilike('name', '%fechado%')
          .limit(1);
        
        if (stages && stages.length > 0) {
          await updateLead.mutateAsync({
            id: leadId,
            stage_id: stages[0].id,
            status: 'closed_won',
            pipeline_tag: newTag
          });
        } else {
          await updateLead.mutateAsync({
            id: leadId,
            pipeline_tag: newTag,
            status: 'closed_won'
          });
        }
      } else if (newTag === 'perdido') {
        // Mover para etapa perdido se existir
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('id, pipeline_id')
          .ilike('name', '%perdido%')
          .limit(1);
        
        if (stages && stages.length > 0) {
          await updateLead.mutateAsync({
            id: leadId,
            stage_id: stages[0].id,
            status: 'closed_lost',
            pipeline_tag: newTag
          });
        } else {
          await updateLead.mutateAsync({
            id: leadId,
            pipeline_tag: newTag,
            status: 'closed_lost'
          });
        }
      } else {
        // Tag aberto - apenas atualiza a tag
        await updateLead.mutateAsync({
          id: leadId,
          pipeline_tag: newTag
        });
      }
      
      onTagChange?.(newTag);
      
      // Invalidar queries para atualização automática
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      toast.success(`Tag alterada para ${tagConfig[newTag as keyof typeof tagConfig].label}`);
    } catch (error) {
      console.error('Erro ao alterar tag:', error);
      toast.error('Erro ao alterar tag');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentTagConfig = tagConfig[currentTag as keyof typeof tagConfig] || tagConfig.aberto;

  return (
    <Select value={currentTag || 'aberto'} onValueChange={handleTagChange} disabled={isUpdating}>
      <SelectTrigger className="w-auto h-6 px-0 border-0 bg-transparent [&>svg]:hidden">
        <Badge 
          variant="secondary" 
          className="text-xs cursor-pointer"
          style={{ 
            backgroundColor: currentTagConfig.color + '15',
            color: currentTagConfig.color,
            borderColor: currentTagConfig.color,
          }}
        >
          {currentTagConfig.label}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(tagConfig).map(([value, config]) => (
          <SelectItem key={value} value={value}>
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ 
                backgroundColor: config.color + '15',
                color: config.color,
                borderColor: config.color,
              }}
            >
              {config.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}