import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Edit, Trash, MessageSquare } from 'lucide-react';
import { useWhatsAppTemplates, useCreateTemplate } from '@/hooks/useWhatsApp';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function MessageTemplates() {
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: 'general'
  });

  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: templates = [], isLoading } = useWhatsAppTemplates(currentWorkspace?.id);
  const createTemplate = useCreateTemplate();

  const categories = [
    { value: 'general', label: 'Geral' },
    { value: 'welcome', label: 'Boas-vindas' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'closing', label: 'Fechamento' },
    { value: 'support', label: 'Suporte' }
  ];

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !user || !newTemplate.name.trim() || !newTemplate.content.trim()) {
      return;
    }

    createTemplate.mutate({
      workspace_id: currentWorkspace.id,
      name: newTemplate.name.trim(),
      content: newTemplate.content.trim(),
      category: newTemplate.category,
      created_by: user.id
    });

    setNewTemplate({ name: '', content: '', category: 'general' });
    setIsCreating(false);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Template copiado para a área de transferência!');
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(cat => cat.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      welcome: 'bg-blue-100 text-blue-800',
      follow_up: 'bg-yellow-100 text-yellow-800',
      closing: 'bg-green-100 text-green-800',
      support: 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Templates de Mensagem</h3>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Nome do Template</Label>
                  <Input
                    id="templateName"
                    placeholder="Ex: Boas-vindas"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateCategory">Categoria</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateContent">Conteúdo da Mensagem</Label>
                <Textarea
                  id="templateContent"
                  placeholder="Digite o conteúdo do template..."
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTemplate.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {createTemplate.isPending ? 'Criando...' : 'Criar Template'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge className={`mt-1 ${getCategoryColor(template.category)}`}>
                    {getCategoryLabel(template.category)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(template.content)}
                    title="Copiar template"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded border-l-4 border-green-500">
                  {template.content}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(template.content)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum Template Criado
                </h3>
                <p className="text-gray-600 mb-4">
                  Crie templates de mensagem para agilizar suas conversas no WhatsApp
                </p>
                <Button
                  onClick={() => setIsCreating(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
