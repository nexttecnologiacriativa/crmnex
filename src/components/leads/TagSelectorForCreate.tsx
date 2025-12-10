import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useLeadTags, useCreateLeadTag } from '@/hooks/useLeadTags';
import { Label } from '@/components/ui/label';

interface TagSelectorForCreateProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export default function TagSelectorForCreate({ selectedTagIds, onTagsChange }: TagSelectorForCreateProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { data: allTags = [], isLoading } = useLeadTags();
  const createTag = useCreateLeadTag();

  const safeAllTags = Array.isArray(allTags) ? allTags.filter(tag => 
    tag && typeof tag === 'object' && tag.id && tag.name && tag.color
  ) : [];

  const selectedTags = safeAllTags.filter(tag => selectedTagIds.includes(tag.id));
  const availableTags = safeAllTags.filter(tag => !selectedTagIds.includes(tag.id));

  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const exactMatch = safeAllTags.find(tag => 
    tag.name.toLowerCase() === searchValue.toLowerCase()
  );

  const handleAddTag = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      onTagsChange([...selectedTagIds, tagId]);
    }
    setOpen(false);
    setSearchValue('');
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateAndAddTag = async () => {
    if (!searchValue.trim()) return;
    
    try {
      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newTag = await createTag.mutateAsync({
        name: searchValue.trim(),
        color: randomColor
      });
      
      onTagsChange([...selectedTagIds, newTag.id]);
      setOpen(false);
      setSearchValue('');
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="text-sm text-muted-foreground">Carregando tags...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap items-center gap-2 min-h-[32px] p-2 border rounded-md bg-background">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="flex items-center gap-1"
            style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 h-3 w-3 hover:bg-muted rounded-full flex items-center justify-center"
            >
              <X className="h-2 w-2" />
            </button>
          </Badge>
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2">
              <Plus className="h-3 w-3 mr-1" />
              <span className="text-xs">Adicionar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
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
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCreateAndAddTag}
                        className="w-full justify-start text-xs"
                        disabled={createTag.isPending}
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
                  {filteredTags.map((tag) => (
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
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
