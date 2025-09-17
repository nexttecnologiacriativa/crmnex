
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Save } from 'lucide-react';
import { useCreateMetaTemplate } from '@/hooks/useMetaTemplates';

interface CreateMetaTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateMetaTemplateDialog({ isOpen, onClose }: CreateMetaTemplateDialogProps) {
  const [templateData, setTemplateData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'pt_BR',
    header: '',
    body: '',
    footer: '',
    buttons: [] as string[]
  });

  const [newButton, setNewButton] = useState('');
  const createTemplate = useCreateMetaTemplate();

  const handleAddButton = () => {
    if (newButton.trim() && templateData.buttons.length < 3) {
      setTemplateData(prev => ({
        ...prev,
        buttons: [...prev.buttons, newButton.trim()]
      }));
      setNewButton('');
    }
  };

  const handleRemoveButton = (index: number) => {
    setTemplateData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!templateData.name || !templateData.body) {
      toast.error('Nome e corpo da mensagem são obrigatórios');
      return;
    }

    try {
      await createTemplate.mutateAsync(templateData);
      
      // Reset form
      setTemplateData({
        name: '',
        category: 'MARKETING',
        language: 'pt_BR',
        header: '',
        body: '',
        footer: '',
        buttons: []
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Template do Meta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Criação de Template</h4>
            <p className="text-sm text-blue-800">
              Este template será enviado diretamente para o Meta Business Manager para aprovação.
              O processo pode levar de algumas horas até alguns dias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateName">Nome do Template</Label>
              <Input
                id="templateName"
                placeholder="ex: boas_vindas_2024"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
              />
              <p className="text-xs text-gray-500 mt-1">Apenas letras minúsculas, números e underscore</p>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={templateData.category} onValueChange={(value) => setTemplateData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utilitário</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="language">Idioma</Label>
            <Select value={templateData.language} onValueChange={(value) => setTemplateData(prev => ({ ...prev, language: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                <SelectItem value="en_US">English (US)</SelectItem>
                <SelectItem value="es_ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="header">Cabeçalho (Opcional)</Label>
            <Input
              id="header"
              placeholder="Título da mensagem"
              value={templateData.header}
              onChange={(e) => setTemplateData(prev => ({ ...prev, header: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="body">Corpo da Mensagem *</Label>
            <Textarea
              id="body"
              placeholder="Conteúdo principal da mensagem. Use {{1}}, {{2}} para variáveis"
              value={templateData.body}
              onChange={(e) => setTemplateData(prev => ({ ...prev, body: e.target.value }))}
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Use {`{{1}}, {{2}}`} etc. para variáveis dinâmicas</p>
          </div>

          <div>
            <Label htmlFor="footer">Rodapé (Opcional)</Label>
            <Input
              id="footer"
              placeholder="Texto do rodapé"
              value={templateData.footer}
              onChange={(e) => setTemplateData(prev => ({ ...prev, footer: e.target.value }))}
            />
          </div>

          <div>
            <Label>Botões de Ação (Máximo 3)</Label>
            <div className="space-y-2">
              {templateData.buttons.map((button, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={button} readOnly className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveButton(index)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              
              {templateData.buttons.length < 3 && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Texto do botão"
                    value={newButton}
                    onChange={(e) => setNewButton(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddButton()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddButton}
                    disabled={!newButton.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={createTemplate.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createTemplate.isPending ? 'Criando...' : 'Criar Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
