import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebriefingPages, type DebriefingPage } from '@/hooks/useDebriefings';

interface PagesTabProps {
  debriefingId: string | null;
}

export const PagesTab = ({ debriefingId }: PagesTabProps) => {
  const { pages, addPage, updatePage, removePage } = useDebriefingPages(debriefingId || '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<DebriefingPage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    page_url: '',
    total_views: 0,
    unique_visitors: 0,
    cta_clicks: 0,
    conversions: 0,
    avg_time_on_page: 0,
    predominant_device: '',
    predominant_traffic_source: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      page_url: '',
      total_views: 0,
      unique_visitors: 0,
      cta_clicks: 0,
      conversions: 0,
      avg_time_on_page: 0,
      predominant_device: '',
      predominant_traffic_source: '',
    });
  };

  const handleAdd = () => {
    if (!debriefingId) return;

    addPage.mutate(formData, {
      onSuccess: () => {
        setShowAddDialog(false);
        resetForm();
      },
    });
  };

  const handleEdit = (page: DebriefingPage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      page_url: page.page_url || '',
      total_views: page.total_views,
      unique_visitors: page.unique_visitors,
      cta_clicks: page.cta_clicks,
      conversions: page.conversions,
      avg_time_on_page: page.avg_time_on_page,
      predominant_device: page.predominant_device || '',
      predominant_traffic_source: page.predominant_traffic_source || '',
    });
  };

  const handleUpdate = () => {
    if (!editingPage) return;

    updatePage.mutate(
      { id: editingPage.id, ...formData },
      {
        onSuccess: () => {
          setEditingPage(null);
          resetForm();
        },
      }
    );
  };

  const handleCancel = () => {
    setShowAddDialog(false);
    setEditingPage(null);
    resetForm();
  };

  if (!debriefingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Páginas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Salve o debriefing primeiro para adicionar páginas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Páginas</CardTitle>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Página
        </Button>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhuma página adicionada ainda
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{page.name}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(page)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePage.mutate(page.id)}
                      disabled={removePage.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {page.page_url && (
                  <p className="text-sm text-muted-foreground mb-2">{page.page_url}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Visualizações:</span>
                    <p className="font-medium">{page.total_views.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Visitantes únicos:</span>
                    <p className="font-medium">{page.unique_visitors.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conversões:</span>
                    <p className="font-medium">{page.conversions.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Taxa de conversão:</span>
                    <p className="font-medium">{page.conversion_rate.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAddDialog || !!editingPage} onOpenChange={handleCancel}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPage ? 'Editar Página' : 'Adicionar Página'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Página *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Página V1, Prova Social"
                />
              </div>

              <div className="space-y-2">
                <Label>URL da Página</Label>
                <Input
                  value={formData.page_url}
                  onChange={(e) => setFormData({ ...formData, page_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Visualizações Totais</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.total_views}
                  onChange={(e) => setFormData({ ...formData, total_views: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Visitantes Únicos</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.unique_visitors}
                  onChange={(e) => setFormData({ ...formData, unique_visitors: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cliques em CTA</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cta_clicks}
                  onChange={(e) => setFormData({ ...formData, cta_clicks: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Conversões</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.conversions}
                  onChange={(e) => setFormData({ ...formData, conversions: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tempo Médio na Página (segundos)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.avg_time_on_page}
                  onChange={(e) => setFormData({ ...formData, avg_time_on_page: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Dispositivo Predominante</Label>
                <Select value={formData.predominant_device} onValueChange={(value) => setFormData({ ...formData, predominant_device: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Desktop">Desktop</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Fonte de Tráfego Predominante</Label>
                <Input
                  value={formData.predominant_traffic_source}
                  onChange={(e) => setFormData({ ...formData, predominant_traffic_source: e.target.value })}
                  placeholder="Ex: Google Ads, Facebook, Orgânico"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={editingPage ? handleUpdate : handleAdd}
                disabled={(editingPage ? updatePage.isPending : addPage.isPending) || !formData.name}
                className="flex-1"
              >
                {editingPage 
                  ? (updatePage.isPending ? "Atualizando..." : "Atualizar")
                  : (addPage.isPending ? "Adicionando..." : "Adicionar")
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};