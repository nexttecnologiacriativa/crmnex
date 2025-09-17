import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDebriefingProducts, useProducts } from '@/hooks/useDebriefings';

interface ProductsTabSeparateProps {
  debriefingId: string | null;
}

export const ProductsTabSeparate = ({ debriefingId }: ProductsTabSeparateProps) => {
  const { products } = useProducts();
  const { products: debriefingProducts, addProduct, updateProduct, removeProduct } = useDebriefingProducts(debriefingId || '');
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    product_id: '',
    unit_price: 0,
    quantity_sold: 0,
  });

  const resetForm = () => {
    setFormData({
      product_id: '',
      unit_price: 0,
      quantity_sold: 0,
    });
    setEditingProduct(null);
    setShowDialog(false);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      product_id: product.product_id,
      unit_price: product.unit_price,
      quantity_sold: product.quantity_sold,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.product_id) return;

    const totalRevenue = formData.unit_price * formData.quantity_sold;

    if (editingProduct) {
      updateProduct.mutate({
        id: editingProduct.id,
        ...formData,
      }, {
        onSuccess: resetForm,
      });
    } else {
      addProduct.mutate({
        ...formData,
      }, {
        onSuccess: resetForm,
      });
    }
  };

  if (!debriefingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Salve o debriefing primeiro para adicionar produtos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalRevenue = debriefingProducts.reduce((sum, product) => sum + (product.total_revenue || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Produtos Vendidos</CardTitle>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto Vendido' : 'Adicionar Produto Vendido'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={formData.product_id}
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      product_id: e.target.value,
                      unit_price: selectedProduct?.default_price || 0
                    });
                  }}
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Unitário (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Vendida</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantity_sold}
                    onChange={(e) => setFormData({ ...formData, quantity_sold: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">Receita Total:</span>
                  <span className="ml-2 text-lg font-bold text-primary">
                    {formatCurrency(formData.unit_price * formData.quantity_sold)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!formData.product_id || addProduct.isPending || updateProduct.isPending}
                  className="flex-1"
                >
                  {(addProduct.isPending || updateProduct.isPending) 
                    ? "Salvando..." 
                    : editingProduct ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {debriefingProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhum produto adicionado ainda
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {debriefingProducts.map((debriefingProduct) => {
              const product = products.find(p => p.id === debriefingProduct.product_id);
              return (
                <div key={debriefingProduct.id} className="p-4 border rounded-lg bg-gradient-to-r from-background to-muted/30">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {product?.name || 'Produto não encontrado'}
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(debriefingProduct)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct.mutate(debriefingProduct.id)}
                        disabled={removeProduct.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium text-primary">{debriefingProduct.quantity_sold}</div>
                      <div className="text-xs text-muted-foreground">Quantidade</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium text-blue-600">{formatCurrency(debriefingProduct.unit_price)}</div>
                      <div className="text-xs text-muted-foreground">Valor Unitário</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium text-green-600">{formatCurrency(debriefingProduct.total_revenue || 0)}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Total geral */}
            <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Faturamento Total dos Produtos:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};