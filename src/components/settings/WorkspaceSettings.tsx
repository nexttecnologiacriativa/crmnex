
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building } from 'lucide-react';

interface WorkspaceSettingsProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function WorkspaceSettings({ currentUserRole }: WorkspaceSettingsProps) {
  const { data: workspaces, refetch } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [description, setDescription] = useState(currentWorkspace?.description || '');

  const isAllowedToEdit = currentUserRole === 'admin';

  const handleUpdateWorkspace = async () => {
    if (!currentWorkspace) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ 
          name: name.trim(),
          description: description.trim() || null
        })
        .eq('id', currentWorkspace.id);

      if (error) throw error;
      
      toast.success('Workspace atualizado com sucesso!');
      refetch();
    } catch (error: any) {
      toast.error('Erro ao atualizar workspace: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Carregando informações do workspace...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Configurações do Workspace
        </CardTitle>
        <CardDescription>
          Gerencie as informações do seu espaço de trabalho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAllowedToEdit && currentUserRole && (
          <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
            Você não tem permissão para editar as configurações do workspace. Apenas administradores podem fazer alterações.
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="workspaceName">Nome do Negócio/Workspace</Label>
          <Input
            id="workspaceName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite o nome do seu negócio"
            disabled={!isAllowedToEdit || isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="workspaceDescription">Descrição (Opcional)</Label>
          <Textarea
            id="workspaceDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva seu negócio ou workspace"
            rows={3}
            disabled={!isAllowedToEdit || isLoading}
          />
        </div>

        <Button 
          onClick={handleUpdateWorkspace} 
          disabled={isLoading || !name.trim() || !isAllowedToEdit}
          className="gradient-premium text-white"
        >
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
}
