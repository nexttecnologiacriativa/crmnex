
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useLeadTags, useLeadTagRelations, useAddTagToLead, useRemoveTagFromLead, useCreateLeadTag } from '@/hooks/useLeadTags';

interface LeadTagSelectorProps {
  leadId: string;
}

export default function LeadTagSelector({ leadId }: LeadTagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { data: allTags = [], isLoading: tagsLoading } = useLeadTags();
  const { data: leadTagRelations = [], isLoading: relationsLoading } = useLeadTagRelations(leadId);
  const addTagToLead = useAddTagToLead();
  const removeTagFromLead = useRemoveTagFromLead();
  const createTag = useCreateLeadTag();

  // Don't render if data is still loading
  if (tagsLoading || relationsLoading) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-gray-500">Carregando tags...</div>
      </div>
    );
  }

  // Ensure we always have arrays to work with and validate data structure
  const safeAllTags = Array.isArray(allTags) ? allTags.filter(tag => 
    tag && 
    typeof tag === 'object' && 
    tag.id && 
    tag.name && 
    tag.color
  ) : [];
  
  const safeLeadTagRelations = Array.isArray(leadTagRelations) ? leadTagRelations.filter(relation => 
    relation && 
    relation.lead_tags && 
    typeof relation.lead_tags === 'object' &&
    relation.lead_tags.id &&
    relation.lead_tags.name &&
    relation.lead_tags.color
  ) : [];

  // Get current lead tags with proper validation
  const leadTags = safeLeadTagRelations
    .map(relation => relation.lead_tags)
    .filter(tag => tag && tag.id);

  // Get available tags (not already assigned to lead)
  const availableTags = safeAllTags.filter(tag => 
    !leadTags.some(leadTag => leadTag.id === tag.id)
  );

  // Filter tags based on search
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Check if search value matches an existing tag
  const exactMatch = safeAllTags.find(tag => 
    tag.name.toLowerCase() === searchValue.toLowerCase()
  );

  const handleAddTag = async (tagId: string) => {
    try {
      // Verificar se a tag já está associada antes de tentar adicionar
      const isTagAlreadyAssigned = leadTags.some(tag => tag.id === tagId);
      
      if (isTagAlreadyAssigned) {
        console.log('Tag já está associada a este lead');
        setOpen(false);
        return;
      }

      await addTagToLead.mutateAsync({ leadId, tagId });
      setOpen(false);
      setSearchValue('');
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!searchValue.trim()) return;
    
    try {
      // Generate a random color for the new tag
      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newTag = await createTag.mutateAsync({
        name: searchValue.trim(),
        color: randomColor
      });
      
      // Add the new tag to the lead
      await addTagToLead.mutateAsync({ leadId, tagId: newTag.id });
      setOpen(false);
      setSearchValue('');
    } catch (error) {
      console.error('Erro ao criar e adicionar tag:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromLead.mutateAsync({ leadId, tagId });
    } catch (error) {
      console.error('Erro ao remover tag:', error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {leadTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1"
          style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
        >
          {tag.name}
          <button
            onClick={() => handleRemoveTag(tag.id)}
            className="ml-1 h-3 w-3 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X className="h-2 w-2" />
          </button>
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput 
              placeholder="Buscar ou criar tag..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {searchValue.trim() && !exactMatch ? (
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCreateAndAddTag}
                      className="w-full justify-start text-xs"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Criar "{searchValue.trim()}"
                    </Button>
                  </div>
                ) : (
                  "Nenhuma tag encontrada."
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleAddTag(tag.id)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </CommandItem>
                  ))
                ) : searchValue.trim() && exactMatch ? (
                  <div className="p-2 text-xs text-gray-500">Tag já existe</div>
                ) : !searchValue.trim() ? (
                  <div className="p-2 text-xs text-gray-500">Todas as tags já estão atribuídas</div>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
