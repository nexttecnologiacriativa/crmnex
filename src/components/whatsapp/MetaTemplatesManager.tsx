
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Eye, RefreshCw, Plus, Filter, Trash2 } from 'lucide-react';
import { useMetaTemplates, useSendMetaTemplate, useDeleteMetaTemplate } from '@/hooks/useMetaTemplates';
import { toast } from 'sonner';
import CreateMetaTemplateDialog from './CreateMetaTemplateDialog';

export default function MetaTemplatesManager() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: templates = [], isLoading, refetch } = useMetaTemplates();
  const sendTemplate = useSendMetaTemplate();
  const deleteTemplate = useDeleteMetaTemplate();

  const getStatusColor = (status: string) => {
    const colors = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
      DISABLED: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      MARKETING: 'bg-blue-100 text-blue-800',
      UTILITY: 'bg-purple-100 text-purple-800',
      AUTHENTICATION: 'bg-orange-100 text-orange-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !phoneNumber.trim()) {
      toast.error('Selecione um template e informe o telefone');
      return;
    }

    try {
      const components = [];
      
      // Se o template tem parâmetros, adicionar aos components
      if (templateParams.length > 0) {
        const bodyComponent = selectedTemplate.components?.find((c: any) => c.type === 'BODY');
        if (bodyComponent) {
          components.push({
            type: 'body',
            parameters: templateParams.map(param => ({
              type: 'text',
              text: param
            }))
          });
        }
      }

      await sendTemplate.mutateAsync({
        to: phoneNumber,
        templateName: selectedTemplate.name,
        language: selectedTemplate.language,
        components
      });

      setIsSendOpen(false);
      setPhoneNumber('');
      setTemplateParams([]);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error sending template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este template?')) {
      try {
        await deleteTemplate.mutateAsync(templateId);
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const renderTemplatePreview = (template: any) => {
    const headerComponent = template.components?.find((c: any) => c.type === 'HEADER');
    const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
    const footerComponent = template.components?.find((c: any) => c.type === 'FOOTER');

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm">
        {headerComponent && (
          <div className="font-semibold text-green-900 mb-2">
            {headerComponent.text}
          </div>
        )}
        
        {bodyComponent && (
          <div className="text-green-800 mb-2 leading-relaxed">
            {bodyComponent.text}
          </div>
        )}
        
        {footerComponent && (
          <div className="text-xs text-green-600 mt-2 pt-2 border-t border-green-200">
            {footerComponent.text}
          </div>
        )}
      </div>
    );
  };

  const getTemplateParameters = (template: any) => {
    const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
    if (!bodyComponent?.text) return [];
    
    const matches = bodyComponent.text.match(/\{\{(\d+)\}\}/g) || [];
    return matches.map((match: string, index: number) => ({
      index,
      placeholder: match,
      name: `Parâmetro ${index + 1}`
    }));
  };

  const filteredTemplates = templates.filter(template => {
    const categoryMatch = categoryFilter === 'all' || template.category === categoryFilter;
    const statusMatch = statusFilter === 'all' || template.status === statusFilter;
    return categoryMatch && statusMatch;
  });

  // Agrupar templates por categoria
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category || 'OTHER';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, any[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="font-semibold">Templates do Meta</h3>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="APPROVED">Aprovados</SelectItem>
              <SelectItem value="PENDING">Pendentes</SelectItem>
              <SelectItem value="REJECTED">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="MARKETING">Marketing</SelectItem>
              <SelectItem value="UTILITY">Utilitário</SelectItem>
              <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Template
          </Button>
        </div>
      </div>

      {Object.keys(groupedTemplates).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum Template Encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Você precisa criar e aprovar templates no Meta Business Manager primeiro
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
              <Button
                onClick={() => window.open('https://business.facebook.com/waba_manager/message_templates', '_blank')}
                variant="outline"
                className="text-blue-600 hover:text-blue-700"
              >
                Criar no Meta Business
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <Badge className={getCategoryColor(category)} variant="outline">
                  {category}
                </Badge>
                <span className="text-sm text-gray-600">
                  {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <div className="space-y-1 mt-2">
                            <Badge className={getStatusColor(template.status)}>
                              {template.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Dialog open={isPreviewOpen && selectedTemplate?.id === template.id} onOpenChange={setIsPreviewOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTemplate(template)}
                                title="Visualizar template"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Preview: {template.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {renderTemplatePreview(template)}
                                <div className="text-sm text-gray-600">
                                  <p><strong>Idioma:</strong> {template.language}</p>
                                  <p><strong>Categoria:</strong> {template.category}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            title="Excluir template"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <p><strong>Idioma:</strong> {template.language}</p>
                        </div>
                        
                        <Dialog open={isSendOpen && selectedTemplate?.id === template.id} onOpenChange={setIsSendOpen}>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => setSelectedTemplate(template)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              disabled={template.status !== 'APPROVED'}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar Template
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Enviar Template: {template.name}</DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Número do WhatsApp</label>
                                <Input
                                  placeholder="(11) 99999-9999"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                              </div>

                              {getTemplateParameters(template).map((param, index) => (
                                <div key={index}>
                                  <label className="text-sm font-medium">{param.name}</label>
                                  <Input
                                    placeholder={`Valor para ${param.placeholder}`}
                                    value={templateParams[index] || ''}
                                    onChange={(e) => {
                                      const newParams = [...templateParams];
                                      newParams[index] = e.target.value;
                                      setTemplateParams(newParams);
                                    }}
                                  />
                                </div>
                              ))}

                              <div className="bg-gray-50 p-3 rounded">
                                <h4 className="font-medium mb-2">Preview:</h4>
                                {renderTemplatePreview(template)}
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setIsSendOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={handleSendTemplate}
                                  disabled={sendTemplate.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {sendTemplate.isPending ? 'Enviando...' : 'Enviar'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateMetaTemplateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
