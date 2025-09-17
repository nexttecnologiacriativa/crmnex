
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCustomFields, useCreateCustomField, useDeleteCustomField } from '@/hooks/useCustomFields';
import { useWorkspaces } from '@/hooks/useWorkspace';

interface CustomFieldsManagerProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function CustomFieldsManager({ currentUserRole }: CustomFieldsManagerProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'select' | 'textarea'>('text');
  const [isCreating, setIsCreating] = useState(false);

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];
  const { data: customFields = [] } = useCustomFields(currentWorkspace?.id);
  const createCustomField = useCreateCustomField();
  const deleteCustomField = useDeleteCustomField();

  const isAllowedToEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  const handleCreateField = async () => {
    if (!newFieldName.trim() || !currentWorkspace || !isAllowedToEdit) return;
    
    try {
      await createCustomField.mutateAsync({
        workspace_id: currentWorkspace.id,
        name: newFieldName,
        field_type: newFieldType,
      });
      
      setNewFieldName('');
      setNewFieldType('text');
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao criar campo:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!currentWorkspace || !isAllowedToEdit) return;
    
    if (confirm('Tem certeza que deseja remover este campo personalizado?')) {
      await deleteCustomField.mutateAsync({
        id: fieldId,
        workspace_id: currentWorkspace.id,
      });
    }
  };

  const fieldTypeLabels = {
    text: 'Texto',
    number: 'Número',
    date: 'Data',
    select: 'Seleção',
    textarea: 'Área de Texto',
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-nexcrm-green">Campos Personalizados</CardTitle>
          {isAllowedToEdit && (
            <Button
              onClick={() => setIsCreating(true)}
              className="gradient-premium text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Campo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {currentUserRole && !isAllowedToEdit && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md mb-4">
              Você não tem permissão para gerenciar campos personalizados. Apenas administradores e gerentes podem fazer alterações.
            </p>
        )}
        {isCreating && isAllowedToEdit && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="space-y-4">
              <div>
                <Label htmlFor="field-name">Nome do Campo</Label>
                <Input
                  id="field-name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Ex: Fonte de Captação"
                />
              </div>
              
              <div>
                <Label htmlFor="field-type">Tipo do Campo</Label>
                <Select value={newFieldType} onValueChange={(value: any) => setNewFieldType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="textarea">Área de Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateField}
                  disabled={!newFieldName.trim() || createCustomField.isPending}
                  className="gradient-premium text-white"
                >
                  {createCustomField.isPending ? 'Criando...' : 'Criar Campo'}
                </Button>
                <Button
                  onClick={() => {
                    setIsCreating(false);
                    setNewFieldName('');
                    setNewFieldType('text');
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {customFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="font-medium">{field.name}</span>
                <Badge variant="outline">{fieldTypeLabels[field.field_type]}</Badge>
                {field.is_required && (
                  <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                )}
              </div>
              
              {isAllowedToEdit && (
                <Button
                  onClick={() => handleDeleteField(field.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deleteCustomField.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          
          {customFields.length === 0 && !isCreating && (
            <p className="text-gray-500 text-center py-8">
              Nenhum campo personalizado criado ainda.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
