import { useState } from 'react';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDebriefingAds, type DebriefingAd } from '@/hooks/useDebriefings';

interface AdsTabProps {
  debriefingId: string | null;
}

export const AdsTab = ({ debriefingId }: AdsTabProps) => {
  const { ads, createAd, updateAd, deleteAd } = useDebriefingAds(debriefingId || '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<DebriefingAd | null>(null);
  const [formData, setFormData] = useState({
    ad_name: '',
    ad_type: '',
    platform: '',
    campaign_objective: '',
    total_spent: 0,
    leads_generated: 0,
    sales_generated: 0,
    ctr: undefined as number | undefined,
    cpc: undefined as number | undefined,
    cpm: undefined as number | undefined,
    performance_rating: 5,
    view_link: '',
    observations: '',
    creative_file_url: '',
  });

  const resetForm = () => {
    setFormData({
      ad_name: '',
      ad_type: '',
      platform: '',
      campaign_objective: '',
      total_spent: 0,
      leads_generated: 0,
      sales_generated: 0,
      ctr: undefined,
      cpc: undefined,
      cpm: undefined,
      performance_rating: 5,
      view_link: '',
      observations: '',
      creative_file_url: '',
    });
  };

  const handleAdd = () => {
    if (!debriefingId) return;

    createAd.mutate({ ...formData, debriefing_id: debriefingId }, {
      onSuccess: () => {
        setShowAddDialog(false);
        resetForm();
      },
    });
  };

  const handleEdit = (ad: DebriefingAd) => {
    setEditingAd(ad);
    setFormData({
      ad_name: ad.ad_name,
      ad_type: ad.ad_type,
      platform: ad.platform,
      campaign_objective: ad.campaign_objective,
      total_spent: ad.total_spent,
      leads_generated: ad.leads_generated,
      sales_generated: ad.sales_generated,
      ctr: ad.ctr || undefined,
      cpc: ad.cpc || undefined,
      cpm: ad.cpm || undefined,
      performance_rating: ad.performance_rating || 5,
      view_link: ad.view_link || '',
      observations: ad.observations || '',
      creative_file_url: ad.creative_file_url || '',
    });
  };

  const handleUpdate = () => {
    if (!editingAd) return;

    updateAd.mutate(
      { id: editingAd.id, ...formData },
      {
        onSuccess: () => {
          setEditingAd(null);
          resetForm();
        },
      }
    );
  };

  const handleCancel = () => {
    setShowAddDialog(false);
    setEditingAd(null);
    resetForm();
  };

  if (!debriefingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anúncios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Salve o debriefing primeiro para adicionar anúncios
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Anúncios</CardTitle>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Anúncio
        </Button>
      </CardHeader>
      <CardContent>
        {ads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhum anúncio adicionado ainda
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{ad.ad_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{ad.platform}</Badge>
                      <Badge variant="outline">{ad.ad_type}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(ad)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAd.mutate(ad.id)}
                      disabled={deleteAd.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Gasto total:</span>
                    <p className="font-medium">R$ {ad.total_spent.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leads:</span>
                    <p className="font-medium">{ad.leads_generated}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendas:</span>
                    <p className="font-medium">{ad.sales_generated}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avaliação:</span>
                    <p className="font-medium">{ad.performance_rating}/10</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAddDialog || !!editingAd} onOpenChange={handleCancel}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAd ? 'Editar Anúncio' : 'Adicionar Anúncio'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Criativo *</Label>
                <Input
                  value={formData.ad_name}
                  onChange={(e) => setFormData({ ...formData, ad_name: e.target.value })}
                  placeholder="Ex: Criativo V1 - Vídeo"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo do Anúncio</Label>
                <Select value={formData.ad_type} onValueChange={(value) => setFormData({ ...formData, ad_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Imagem">Imagem</SelectItem>
                    <SelectItem value="Vídeo">Vídeo</SelectItem>
                    <SelectItem value="Carrossel">Carrossel</SelectItem>
                    <SelectItem value="Collection">Collection</SelectItem>
                    <SelectItem value="Stories">Stories</SelectItem>
                    <SelectItem value="Texto">Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                    <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
                    <SelectItem value="LinkedIn Ads">LinkedIn Ads</SelectItem>
                    <SelectItem value="Pinterest Ads">Pinterest Ads</SelectItem>
                    <SelectItem value="YouTube Ads">YouTube Ads</SelectItem>
                    <SelectItem value="Kwai Ads">Kwai Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Objetivo da Campanha</Label>
                <Input
                  value={formData.campaign_objective}
                  onChange={(e) => setFormData({ ...formData, campaign_objective: e.target.value })}
                  placeholder="Ex: Conversões, Tráfego, Reconhecimento"
                />
              </div>

              <div className="space-y-2">
                <Label>Gasto Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_spent}
                  onChange={(e) => setFormData({ ...formData, total_spent: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Leads Gerados</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.leads_generated}
                  onChange={(e) => setFormData({ ...formData, leads_generated: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Vendas Geradas</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.sales_generated}
                  onChange={(e) => setFormData({ ...formData, sales_generated: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Avaliação de Performance (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.performance_rating}
                  onChange={(e) => setFormData({ ...formData, performance_rating: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>CTR (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.ctr || ''}
                  onChange={(e) => setFormData({ ...formData, ctr: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>

              <div className="space-y-2">
                <Label>CPC (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cpc || ''}
                  onChange={(e) => setFormData({ ...formData, cpc: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>

              <div className="space-y-2">
                <Label>CPM (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cpm || ''}
                  onChange={(e) => setFormData({ ...formData, cpm: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>

              <div className="space-y-2">
                <Label>Link para Visualizar</Label>
                <Input
                  value={formData.view_link}
                  onChange={(e) => setFormData({ ...formData, view_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observações sobre performance, insights, etc."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={editingAd ? handleUpdate : handleAdd}
                disabled={(editingAd ? updateAd.isPending : createAd.isPending) || !formData.ad_name}
                className="flex-1"
              >
                {editingAd 
                  ? (updateAd.isPending ? "Atualizando..." : "Atualizar")
                  : (createAd.isPending ? "Adicionando..." : "Adicionar")
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};