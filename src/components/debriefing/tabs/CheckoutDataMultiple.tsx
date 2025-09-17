import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface CheckoutEntry {
  id: string;
  platform: string;
  views: number;
  completed_purchases: number;
  abandonment_reasons?: string;
}

interface CheckoutDataMultipleProps {
  debriefingId: string | null;
}

export const CheckoutDataMultiple = ({ debriefingId }: CheckoutDataMultipleProps) => {
  const [checkoutEntries, setCheckoutEntries] = useState<CheckoutEntry[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<CheckoutEntry | null>(null);
  const [platform, setPlatform] = useState('');
  const [views, setViews] = useState<number>(0);
  const [completedPurchases, setCompletedPurchases] = useState<number>(0);
  const [abandonmentReasons, setAbandonmentReasons] = useState('');

  const handleAddCheckout = () => {
    const newCheckout: CheckoutEntry = {
      id: crypto.randomUUID(),
      platform,
      views,
      completed_purchases: completedPurchases,
      abandonment_reasons: abandonmentReasons || undefined,
    };
    setCheckoutEntries([...checkoutEntries, newCheckout]);
    resetForm();
  };

  const handleEditCheckout = (checkout: CheckoutEntry) => {
    setEditingCheckout(checkout);
    setPlatform(checkout.platform);
    setViews(checkout.views);
    setCompletedPurchases(checkout.completed_purchases);
    setAbandonmentReasons(checkout.abandonment_reasons || '');
    setShowDialog(true);
  };

  const handleUpdateCheckout = () => {
    if (!editingCheckout) return;
    
    const updatedCheckouts = checkoutEntries.map(checkout =>
      checkout.id === editingCheckout.id
        ? {
            ...checkout,
            platform,
            views,
            completed_purchases: completedPurchases,
            abandonment_reasons: abandonmentReasons || undefined,
          }
        : checkout
    );
    setCheckoutEntries(updatedCheckouts);
    resetForm();
  };

  const handleRemoveCheckout = (id: string) => {
    setCheckoutEntries(checkoutEntries.filter(checkout => checkout.id !== id));
  };

  const resetForm = () => {
    setShowDialog(false);
    setEditingCheckout(null);
    setPlatform('');
    setViews(0);
    setCompletedPurchases(0);
    setAbandonmentReasons('');
  };

  // Calcular totais
  const totalViews = checkoutEntries.reduce((sum, checkout) => sum + checkout.views, 0);
  const totalPurchases = checkoutEntries.reduce((sum, checkout) => sum + checkout.completed_purchases, 0);
  const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

  if (!debriefingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados do Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Salve o debriefing primeiro para adicionar dados de checkout
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dados do Checkout</CardTitle>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Checkout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCheckout ? 'Editar Checkout' : 'Adicionar Checkout'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotmart">Hotmart</SelectItem>
                    <SelectItem value="eduzz">Eduzz</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="monetizze">Monetizze</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Visualizações do Checkout</Label>
                  <Input
                    type="number"
                    min="0"
                    value={views}
                    onChange={(e) => setViews(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Compras Finalizadas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={completedPurchases}
                    onChange={(e) => setCompletedPurchases(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivos de Abandono (opcional)</Label>
                <Textarea
                  value={abandonmentReasons}
                  onChange={(e) => setAbandonmentReasons(e.target.value)}
                  placeholder="Descreva os principais motivos de abandono..."
                />
              </div>

              {views > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Taxa de Conversão:</strong> {((completedPurchases / views) * 100).toFixed(2)}%
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={editingCheckout ? handleUpdateCheckout : handleAddCheckout}
                  disabled={!platform}
                  className="flex-1"
                >
                  {editingCheckout ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {checkoutEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhum checkout adicionado ainda
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {checkoutEntries.map((checkout) => (
              <div key={checkout.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{checkout.platform}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCheckout(checkout)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCheckout(checkout.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Visualizações</span>
                    <p className="font-medium text-lg">{checkout.views.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Compras</span>
                    <p className="font-medium text-lg">{checkout.completed_purchases.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Conversão</span>
                    <p className="font-medium text-lg text-green-600">
                      {checkout.views > 0 ? ((checkout.completed_purchases / checkout.views) * 100).toFixed(2) : 0}%
                    </p>
                  </div>
                </div>
                
                {checkout.abandonment_reasons && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-muted-foreground text-sm block mb-1">Motivos de abandono:</span>
                    <p className="text-sm">{checkout.abandonment_reasons}</p>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Total de Visualizações</span>
                  <p className="text-lg font-semibold">{totalViews.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total de Compras</span>
                  <p className="text-lg font-semibold">{totalPurchases.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Conversão Geral</span>
                  <p className="text-lg font-semibold text-green-600">{conversionRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};