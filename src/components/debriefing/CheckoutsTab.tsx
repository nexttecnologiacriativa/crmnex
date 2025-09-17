import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDebriefingCheckouts, useProducts } from '@/hooks/useDebriefings';
import { Badge } from '@/components/ui/badge';

interface CheckoutsTabProps {
  debriefingId: string | null;
}

export const CheckoutsTab = ({ debriefingId }: CheckoutsTabProps) => {
  const { products } = useProducts();
  const { checkouts, createCheckout, updateCheckout, deleteCheckout } = useDebriefingCheckouts(debriefingId || '');
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    checkout_url: '',
    platform: '',
    product_id: 'none',
    total_views: 0,
    checkout_starts: 0,
    checkout_abandonments: 0,
    completed_purchases: 0,
  });

  const platforms = [
    'Hotmart',
    'Monetizze', 
    'Kiwify',
    'Eduzz',
    'Braip',
    'PagSeguro',
    'PayPal',
    'Stripe',
    'Mercado Pago',
    'Outro'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      checkout_url: '',
      platform: '',
      product_id: 'none',
      total_views: 0,
      checkout_starts: 0,
      checkout_abandonments: 0,
      completed_purchases: 0,
    });
    setEditingCheckout(null);
    setShowDialog(false);
  };

  const handleEdit = (checkout: any) => {
    setEditingCheckout(checkout);
    setFormData({
      name: checkout.name,
      checkout_url: checkout.checkout_url || '',
      platform: checkout.platform || '',
      product_id: checkout.product_id || 'none',
      total_views: checkout.total_views,
      checkout_starts: checkout.checkout_starts,
      checkout_abandonments: checkout.checkout_abandonments,
      completed_purchases: checkout.completed_purchases,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.name) return;

    if (editingCheckout) {
      updateCheckout.mutate({
        id: editingCheckout.id,
        ...formData,
        product_id: formData.product_id === 'none' ? null : formData.product_id
      }, {
        onSuccess: resetForm,
      });
    } else {
      createCheckout.mutate({
        ...formData,
        product_id: formData.product_id === 'none' ? null : formData.product_id
      }, {
        onSuccess: resetForm,
      });
    }
  };

  if (!debriefingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checkouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Salve o debriefing primeiro para adicionar checkouts
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Checkouts</CardTitle>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Checkout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCheckout ? 'Editar Checkout' : 'Adicionar Checkout'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Checkout *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Checkout Produto A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL do Checkout</Label>
                  <Input
                    value={formData.checkout_url}
                    onChange={(e) => setFormData({ ...formData, checkout_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produto Relacionado</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum produto</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total de Visualizações</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.total_views}
                    onChange={(e) => setFormData({ ...formData, total_views: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Checkouts Iniciados</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.checkout_starts}
                    onChange={(e) => setFormData({ ...formData, checkout_starts: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Abandonos do Checkout</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.checkout_abandonments}
                    onChange={(e) => setFormData({ ...formData, checkout_abandonments: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compras Finalizadas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.completed_purchases}
                    onChange={(e) => setFormData({ ...formData, completed_purchases: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Taxa de Conversão:</span>
                    <span className="ml-2">
                      {formData.total_views > 0 
                        ? ((formData.completed_purchases / formData.total_views) * 100).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Taxa de Abandono:</span>
                    <span className="ml-2">
                      {formData.checkout_starts > 0 
                        ? ((formData.checkout_abandonments / formData.checkout_starts) * 100).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!formData.name || createCheckout.isPending || updateCheckout.isPending}
                  className="flex-1"
                >
                  {(createCheckout.isPending || updateCheckout.isPending) 
                    ? "Salvando..." 
                    : editingCheckout ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {checkouts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhum checkout adicionado ainda
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {checkouts.map((checkout) => {
              const product = products.find(p => p.id === checkout.product_id);
              return (
                <div key={checkout.id} className="p-4 border rounded-lg bg-gradient-to-r from-background to-muted/30">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        {checkout.name}
                        {checkout.platform && (
                          <Badge variant="secondary" className="text-xs">
                            {checkout.platform}
                          </Badge>
                        )}
                      </h4>
                      {product && (
                        <p className="text-sm text-muted-foreground">
                          Produto: {product.name}
                        </p>
                      )}
                      {checkout.checkout_url && (
                        <p className="text-xs text-muted-foreground truncate">
                          {checkout.checkout_url}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(checkout)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCheckout.mutate(checkout.id)}
                        disabled={deleteCheckout.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium text-primary">{checkout.total_views.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Visualizações</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium text-blue-600">{checkout.checkout_starts.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Iniciados</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium text-red-600">{checkout.checkout_abandonments.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Abandonos</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium text-green-600">{checkout.completed_purchases.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Finalizados</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div className="text-center p-2 bg-primary/10 rounded">
                      <div className="font-medium text-primary">{checkout.conversion_rate.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground">Taxa de Conversão</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="font-medium text-red-600">{checkout.abandonment_rate.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground">Taxa de Abandono</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};