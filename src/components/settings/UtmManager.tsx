
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Trash2, Tag } from 'lucide-react';
import { useUtmValues } from '@/hooks/useUtmValues';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { useQueryClient } from '@tanstack/react-query';

interface EditingValue {
  type: string;
  oldValue: string;
  newValue: string;
}

interface UtmTableProps {
  title: string;
  values: string[];
  type: string;
  onEdit: (type: string, value: string) => void;
  onDelete: (type: string, value: string) => void;
  isAllowedToEdit: boolean;
}

const UtmTable = ({ title, values, type, onEdit, onDelete, isAllowedToEdit }: UtmTableProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Tag className="h-5 w-5" />
        {title}
      </CardTitle>
      <CardDescription>
        Valores de {title.toLowerCase()} coletados dos leads
      </CardDescription>
    </CardHeader>
    <CardContent>
      {values.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          Nenhum valor encontrado
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valor</TableHead>
              {isAllowedToEdit && <TableHead className="w-24 text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {values.map((value) => (
              <TableRow key={value}>
                <TableCell className="font-medium">{value}</TableCell>
                {isAllowedToEdit && (
                  <TableCell className="text-right">
                    <div className="flex space-x-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(type, value)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(type, value)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);

interface UtmManagerProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}


export default function UtmManager({ currentUserRole }: UtmManagerProps) {
  const [editingValue, setEditingValue] = useState<EditingValue>({ 
    type: '', 
    oldValue: '', 
    newValue: '' 
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.[0];
  const queryClient = useQueryClient();

  const { utmSources, utmMediums, utmCampaigns } = useUtmValues();
  
  const isAllowedToEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  const handleEdit = (type: string, value: string) => {
    setEditingValue({ type, oldValue: value, newValue: value });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!currentWorkspace || !editingValue.newValue.trim()) return;

    try {
      const newValue = editingValue.newValue.trim();
      
      // Use separate update calls for each UTM type to avoid TypeScript inference issues
      if (editingValue.type === 'source') {
        const { error } = await supabase
          .from('leads')
          .update({ utm_source: newValue })
          .eq('workspace_id', currentWorkspace.id)
          .eq('utm_source', editingValue.oldValue);
        if (error) throw error;
      } else if (editingValue.type === 'medium') {
        const { error } = await supabase
          .from('leads')
          .update({ utm_medium: newValue })
          .eq('workspace_id', currentWorkspace.id)
          .eq('utm_medium', editingValue.oldValue);
        if (error) throw error;
      } else if (editingValue.type === 'campaign') {
        const { error } = await supabase
          .from('leads')
          .update({ utm_campaign: newValue })
          .eq('workspace_id', currentWorkspace.id)
          .eq('utm_campaign', editingValue.oldValue);
        if (error) throw error;
      }

      toast.success('Valor UTM atualizado com sucesso!');
      setIsEditDialogOpen(false);
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['utm-sources', currentWorkspace.id] });
      queryClient.invalidateQueries({ queryKey: ['utm-mediums', currentWorkspace.id] });
      queryClient.invalidateQueries({ queryKey: ['utm-campaigns', currentWorkspace.id] });
    } catch (error: any) {
      toast.error('Erro ao atualizar valor UTM: ' + error.message);
    }
  };

  const handleDelete = async (type: string, value: string) => {
    if (!currentWorkspace) return;
    
    if (!confirm(`Tem certeza que deseja remover o valor "${value}" de todos os leads?`)) {
      return;
    }

    try {
      // Use separate update calls for each UTM type to avoid TypeScript inference issues
      if (type === 'source') {
        const { error } = await supabase
          .from('leads')
          .update({ utm_source: null })
          .eq('workspace_id', currentWorkspace.id)
          .eq('utm_source', value);
        if (error) throw error;
      } else if (type === 'medium') {
        const { error } = await supabase
          .from('leads')
          .update({ utm_medium: null })
          .eq('workspace_id', currentWorkspace.id)
          .eq('utm_medium', value);
        if (error) throw error;
      } else if (type === 'campaign') {
        const { error } = await supabase
          .from('leads')
          .update({ utm_campaign: null })
          .eq('workspace_id', currentWorkspace.id)
          .eq('utm_campaign', value);
        if (error) throw error;
      }

      toast.success('Valor UTM removido com sucesso!');
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['utm-sources', currentWorkspace.id] });
      queryClient.invalidateQueries({ queryKey: ['utm-mediums', currentWorkspace.id] });
      queryClient.invalidateQueries({ queryKey: ['utm-campaigns', currentWorkspace.id] });
    } catch (error: any) {
      toast.error('Erro ao remover valor UTM: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciamento de UTMs</h2>
        <p className="text-gray-600 mt-2">
          Gerencie os valores de UTM (fontes, mídias e campanhas) coletados dos seus leads.
        </p>
      </div>
      
      {currentUserRole && !isAllowedToEdit && (
          <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
            Você não tem permissão para gerenciar UTMs. Apenas administradores e gerentes podem fazer alterações.
          </p>
      )}

      <div className="grid gap-6">
        <UtmTable 
          title="UTM Sources" 
          values={utmSources} 
          type="source" 
          onEdit={handleEdit}
          onDelete={handleDelete}
          isAllowedToEdit={isAllowedToEdit}
        />
        <UtmTable 
          title="UTM Mediums" 
          values={utmMediums} 
          type="medium" 
          onEdit={handleEdit}
          onDelete={handleDelete}
          isAllowedToEdit={isAllowedToEdit}
        />
        <UtmTable 
          title="UTM Campaigns" 
          values={utmCampaigns} 
          type="campaign" 
          onEdit={handleEdit}
          onDelete={handleDelete}
          isAllowedToEdit={isAllowedToEdit}
        />
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Valor UTM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newValue">Novo Valor</Label>
              <Input
                id="newValue"
                value={editingValue.newValue}
                onChange={(e) => setEditingValue(prev => ({ ...prev, newValue: e.target.value }))}
                placeholder="Digite o novo valor"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
