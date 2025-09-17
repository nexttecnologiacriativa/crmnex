
import { useState } from 'react';
import { Palette, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLeadTags, useCreateLeadTag, useUpdateLeadTag, useDeleteLeadTag } from '@/hooks/useLeadTags';
import { toast } from 'sonner';

const COLOR_OPTIONS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', 
  '#ef4444', '#06b6d4', '#84cc16', '#f97316',
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b'
];

interface TagManagerProps {
  currentUserRole?: 'admin' | 'manager' | 'user';
}

export default function TagManager({ currentUserRole }: TagManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLOR_OPTIONS[0]);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const { data: tags = [], isLoading } = useLeadTags();
  const createTag = useCreateLeadTag();
  const updateTag = useUpdateLeadTag();
  const deleteTag = useDeleteLeadTag();

  const isAllowedToEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Nome da tag é obrigatório');
      return;
    }

    try {
      await createTag.mutateAsync({
        name: newTagName.trim(),
        color: newTagColor
      });
      setNewTagName('');
      setNewTagColor(COLOR_OPTIONS[0]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  const handleEditTag = (tag: any) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleUpdateTag = async () => {
    if (!editTagName.trim()) {
      toast.error('Nome da tag é obrigatório');
      return;
    }

    try {
      await updateTag.mutateAsync({
        id: editingTag.id,
        name: editTagName.trim(),
        color: editTagColor
      });
      setEditingTag(null);
      setEditTagName('');
      setEditTagColor('');
    } catch (error) {
      console.error('Erro ao atualizar tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag.mutateAsync(tagId);
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Carregando tags...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Tags</CardTitle>
        {isAllowedToEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tagName">Nome da Tag</Label>
                  <Input
                    id="tagName"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Digite o nome da tag"
                  />
                </div>
                <div>
                  <Label>Cor da Tag</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newTagColor === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTag} disabled={createTag.isPending}>
                    {createTag.isPending ? 'Criando...' : 'Criar Tag'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {currentUserRole && !isAllowedToEdit && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md mb-4">
              Você não tem permissão para gerenciar tags. Apenas administradores e gerentes podem fazer alterações.
            </p>
        )}
        {tags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma tag criada ainda. Clique em "Nova Tag" para começar.
          </div>
        ) : (
          <div className="space-y-3">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <Badge
                    variant="secondary"
                    style={{ 
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                      borderColor: tag.color,
                    }}
                  >
                    {tag.name}
                  </Badge>
                </div>
                {isAllowedToEdit && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTag(tag)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a tag "{tag.name}"? 
                            Esta ação removerá a tag de todos os leads e não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteTag(tag.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTagName">Nome da Tag</Label>
                <Input
                  id="editTagName"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  placeholder="Digite o nome da tag"
                />
              </div>
              <div>
                <Label>Cor da Tag</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditTagColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editTagColor === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTag(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateTag} disabled={updateTag.isPending}>
                  {updateTag.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
