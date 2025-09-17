
import { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Hash } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  content?: string;
  status?: string;
  type: 'internal' | 'meta';
}

interface TemplateCommandPopoverProps {
  children: React.ReactNode;
  internalTemplates: any[];
  metaTemplates: any[];
  onSelectTemplate: (template: Template) => void;
}

export default function TemplateCommandPopover({
  children,
  internalTemplates = [],
  metaTemplates = [],
  onSelectTemplate
}: TemplateCommandPopoverProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [shouldShowTemplates, setShouldShowTemplates] = useState(false);

  // Monitora quando o usuário digita / para mostrar templates
  useEffect(() => {
    if (inputValue === '/') {
      setShouldShowTemplates(true);
      setOpen(true);
    } else if (inputValue === '' || !inputValue.startsWith('/')) {
      setShouldShowTemplates(false);
      setOpen(false);
    }
  }, [inputValue]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleSelect = (template: Template) => {
    onSelectTemplate(template);
    setOpen(false);
    setShouldShowTemplates(false);
    setInputValue('');
  };

  const allTemplates = [
    ...internalTemplates.map(t => ({
      id: t.id,
      name: t.name,
      content: t.content,
      type: 'internal' as const
    })),
    ...metaTemplates.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      type: 'meta' as const
    }))
  ];

  const filteredTemplates = allTemplates.filter(template =>
    template.name.toLowerCase().includes(inputValue.slice(1).toLowerCase())
  );

  return (
    <Popover open={open && shouldShowTemplates} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Digite o nome do template..."
            value={inputValue.slice(1)}
            onValueChange={(value) => handleInputChange('/' + value)}
          />
          <CommandList>
            <CommandEmpty>Nenhum template encontrado.</CommandEmpty>
            
            {internalTemplates.length > 0 && (
              <CommandGroup heading="Templates Internos">
                {filteredTemplates
                  .filter(t => t.type === 'internal')
                  .map((template) => (
                    <CommandItem
                      key={template.id}
                      onSelect={() => handleSelect(template)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span>{template.name}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {metaTemplates.length > 0 && (
              <CommandGroup heading="Templates do Meta">
                {filteredTemplates
                  .filter(t => t.type === 'meta')
                  .map((template) => (
                    <CommandItem
                      key={template.id}
                      onSelect={() => handleSelect(template)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Hash className="h-4 w-4 text-green-500" />
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge 
                          variant={template.status === 'APPROVED' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.status}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
