import { useState } from 'react';
import { Plus, Trash2, Edit2, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProducts, useDebriefingProducts } from '@/hooks/useDebriefings';
import { Separator } from '@/components/ui/separator';

interface ProductsTabProps {
  debriefingId: string | null;
}

export const ProductsTab = ({ debriefingId }: ProductsTabProps) => {
  const { products, createProduct, updateProduct: updateMasterProduct, deleteProduct } = useProducts();
  const { products: debriefingProducts, addProduct, removeProduct, updateProduct } = useDebriefingProducts(debriefingId || '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingMasterProduct, setEditingMasterProduct] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'select' | 'create' | 'edit'>('select');

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setUnitPrice(product.default_price);
    }
  };

  const handleAddProduct = () => {
    if (!selectedProductId || !debriefingId) return;

    addProduct.mutate(
      {
        product_id: selectedProductId,
        unit_price: unitPrice,
        quantity_sold: quantity,
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setSelectedProductId('');
          setUnitPrice(0);
          setQuantity(1);
        },
      }
    );
  };

  const handleCreateProduct = () => {
    if (!productName || !debriefingId) return;

    createProduct.mutate(
      {
        name: productName,
        default_price: productPrice,
      },
      {
        onSuccess: (newProduct) => {
          addProduct.mutate(
            {
              product_id: newProduct.id,
              unit_price: productPrice,
              quantity_sold: 0,
            },
            {
              onSuccess: () => {
                setShowAddDialog(false);
                setProductName('');
                setProductPrice(0);
                setUnitPrice(0);
                setQuantity(0);
                setActiveTab('select');
              },
            }
          );
        },
      }
    );
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setQuantity(product.quantity_sold);
    setUnitPrice(product.unit_price);
    setShowAddDialog(true);
    setActiveTab('edit');
  };

  const handleUpdateProduct = () => {
    if (!editingProduct) return;

    updateProduct.mutate({
      id: editingProduct.id,
      unit_price: unitPrice,
      quantity_sold: quantity,
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setEditingProduct(null);
        setQuantity(0);
        setUnitPrice(0);
      },
    });
  };

  const handleEditMasterProduct = (product: any) => {
    setEditingMasterProduct(product);
    setProductName(product.name);
    setProductPrice(product.default_price);
  };

  const handleUpdateMasterProduct = () => {
    if (!editingMasterProduct) return;

    updateMasterProduct.mutate({
      id: editingMasterProduct.id,
      name: productName,
      default_price: productPrice,
    }, {
      onSuccess: () => {
        setEditingMasterProduct(null);
        setProductName('');
        setProductPrice(0);
      },
    });
  };

  const handleDeleteMasterProduct = (productId: string) => {
    deleteProduct.mutate(productId);
  };

  const resetForm = () => {
    setShowAddDialog(false);
    setEditingProduct(null);
    setSelectedProductId('');
    setUnitPrice(0);
    setQuantity(0);
    setProductName('');
    setProductPrice(0);
    setActiveTab('select');
  };

  const totalRevenue = debriefingProducts.reduce((sum, item) => sum + item.total_revenue, 0);

  if (!debriefingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produtos Vendidos</CardTitle>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciar Produtos</CardTitle>
          <Button variant="outline" onClick={() => setShowManageDialog(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Gerenciar Produtos
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Nenhum produto cadastrado</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/50">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Preço padrão: R$ {product.default_price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMasterProduct(product)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMasterProduct(product.id)}
                      disabled={deleteProduct.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Produtos Vendidos</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'select' | 'create' | 'edit')} className="w-full">
              <TabsList className={`grid w-full ${editingProduct ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!editingProduct && <TabsTrigger value="select">Selecionar Existente</TabsTrigger>}
                {!editingProduct && <TabsTrigger value="create">Criar Novo</TabsTrigger>}
                {editingProduct && <TabsTrigger value="edit">Editar Produto</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="select" className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select value={selectedProductId} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - R$ {product.default_price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor Unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantidade Vendida</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Faturamento Total:</strong> R$ {(unitPrice * quantity).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddProduct} 
                    disabled={!selectedProductId || addProduct.isPending}
                    className="flex-1"
                  >
                    {addProduct.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="create" className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Produto</Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Digite o nome do produto"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço Padrão (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productPrice}
                    onChange={(e) => setProductPrice(Number(e.target.value))}
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Valor do Produto:</strong> R$ {productPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Produto será criado sem quantidade inicial vendida
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateProduct} 
                    disabled={!productName || createProduct.isPending || addProduct.isPending}
                    className="flex-1"
                  >
                    {(createProduct.isPending || addProduct.isPending) ? "Criando..." : "Criar Produto"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="edit" className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{products.find(p => p.id === editingProduct?.product_id)?.name}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valor Unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantidade Vendida</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Faturamento Total:</strong> R$ {(unitPrice * quantity).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleUpdateProduct} 
                    disabled={updateProduct.isPending}
                    className="flex-1"
                  >
                    {updateProduct.isPending ? "Atualizando..." : "Atualizar"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
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
            {debriefingProducts.map((item) => {
              const product = products.find(p => p.id === item.product_id);
              return (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{product?.name || 'Produto não encontrado'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity_sold}x R$ {item.unit_price.toLocaleString()} = R$ {item.total_revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditProduct(item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct.mutate(item.id)}
                      disabled={removeProduct.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-4">
              <p className="text-lg font-semibold">
                Faturamento Total: R$ {totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Dialog para gerenciar produtos */}
    <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Produtos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {editingMasterProduct ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Padrão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productPrice}
                  onChange={(e) => setProductPrice(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingMasterProduct(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpdateMasterProduct}
                  disabled={updateMasterProduct.isPending}
                  className="flex-1"
                >
                  {updateMasterProduct.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Digite o nome do produto"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Padrão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productPrice}
                  onChange={(e) => setProductPrice(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowManageDialog(false);
                    setProductName('');
                    setProductPrice(0);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    createProduct.mutate({
                      name: productName,
                      default_price: productPrice,
                    }, {
                      onSuccess: () => {
                        setProductName('');
                        setProductPrice(0);
                      },
                    });
                  }}
                  disabled={!productName || createProduct.isPending}
                  className="flex-1"
                >
                  {createProduct.isPending ? "Criando..." : "Criar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  </div>
  );
};