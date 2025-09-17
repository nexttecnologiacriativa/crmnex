import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, TrendingUp, DollarSign, Users, MousePointer, ShoppingCart, BarChart3, Target, Eye, Edit, ExternalLink, PlayCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebriefings, useDebriefingPages, useDebriefingAds, useDebriefingProducts, useProducts, useDebriefingCheckouts } from '@/hooks/useDebriefings';
import DashboardLayout from '@/components/layout/DashboardLayout';

const campaignTypeLabels = {
  semente: 'Semente',
  interno: 'Interno',
  desafio: 'Desafio',
  perpetuo: 'Perpétuo',
  campanha: 'Campanha',
  outro: 'Outro',
};

const campaignTypeColors = {
  semente: 'bg-green-100 text-green-700 border-green-200',
  interno: 'bg-blue-100 text-blue-700 border-blue-200',
  desafio: 'bg-orange-100 text-orange-700 border-orange-200',
  perpetuo: 'bg-purple-100 text-purple-700 border-purple-200',
  campanha: 'bg-red-100 text-red-700 border-red-200',
  outro: 'bg-gray-100 text-gray-700 border-gray-200',
};

const formatCurrency = (value?: number) => {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const DebriefingView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { debriefings, isLoading } = useDebriefings();
  const { pages } = useDebriefingPages(id || '');
  const { ads } = useDebriefingAds(id || '');
  const { checkouts } = useDebriefingCheckouts(id || '');
  const { products: debriefingProducts } = useDebriefingProducts(id || '');
  const { products } = useProducts();

  const debriefing = debriefings.find(d => d.id === id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!debriefing) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-xl font-semibold mb-2">Debriefing não encontrado</h2>
          <Button onClick={() => navigate('/debriefing')}>
            Voltar para lista
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Calcular faturamento bruto baseado nos produtos vendidos nos checkouts
  const grossRevenueFromProducts = debriefingProducts.reduce((total, product) => {
    return total + (product.total_revenue || 0);
  }, 0);

  const totalSalesFromCheckouts = checkouts.reduce((total, checkout) => {
    return total + checkout.completed_purchases;
  }, 0);

  // Usar o faturamento calculado dos produtos ou o valor manual do debriefing
  const finalGrossRevenue = grossRevenueFromProducts > 0 ? grossRevenueFromProducts : debriefing.gross_revenue;

  // Calcular métricas
  const conversionRate = debriefing.leads_captured && totalSalesFromCheckouts > 0
    ? (totalSalesFromCheckouts / debriefing.leads_captured) * 100
    : 0;

  const pageConversionRate = debriefing.unique_visitors && debriefing.conversions
    ? (debriefing.conversions / debriefing.unique_visitors) * 100
    : 0;

  const totalCheckoutViews = checkouts.reduce((total, checkout) => total + checkout.total_views, 0);
  const checkoutConversionRate = totalCheckoutViews > 0 && totalSalesFromCheckouts > 0
    ? (totalSalesFromCheckouts / totalCheckoutViews) * 100
    : 0;

  const ticketMedio = totalSalesFromCheckouts > 0 && finalGrossRevenue 
    ? finalGrossRevenue / totalSalesFromCheckouts 
    : 0;

  const roi = debriefing.total_investment && finalGrossRevenue
    ? ((finalGrossRevenue - debriefing.total_investment) / debriefing.total_investment) * 100
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/debriefing')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{debriefing.project_name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge 
                variant="secondary" 
                className={`${campaignTypeColors[debriefing.campaign_type as keyof typeof campaignTypeColors]}`}
              >
                {campaignTypeLabels[debriefing.campaign_type as keyof typeof campaignTypeLabels]}
              </Badge>
              
              {(debriefing.start_date || debriefing.end_date) && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {debriefing.start_date && format(new Date(debriefing.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                    {debriefing.start_date && debriefing.end_date && ' - '}
                    {debriefing.end_date && format(new Date(debriefing.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              )}

              {debriefing.responsible && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  <span>{debriefing.responsible}</span>
                </div>
              )}
            </div>
          </div>
          <Button 
            onClick={() => navigate(`/debriefing/${debriefing.id}/edit`)}
            className="bg-primary hover:bg-primary/90"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>

        {/* Métricas principais */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <DollarSign className="w-full h-full" />
            </div>
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Faturamento Total</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(finalGrossRevenue)}
              </div>
              {roi > 0 && (
                <div className="text-sm text-emerald-100">
                  ROI: {roi.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <Target className="w-full h-full" />
            </div>
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Conversão do Lançamento</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Target className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">
                {conversionRate > 0 ? `${conversionRate.toFixed(1)}%` : '-'}
              </div>
              <div className="text-sm text-blue-100">
                {totalSalesFromCheckouts || 0} vendas de {debriefing.leads_captured || 0} leads
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <Eye className="w-full h-full" />
            </div>
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Conversão da Página</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">
                {pageConversionRate > 0 ? `${pageConversionRate.toFixed(1)}%` : '-'}
              </div>
              <div className="text-sm text-purple-100">
                {debriefing.conversions || 0} conversões de {debriefing.unique_visitors || 0} visitantes
              </div>
            </CardContent>
          </Card>
        </div>

        {checkoutConversionRate > 0 && (
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <ShoppingCart className="w-full h-full" />
            </div>
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Conversão do Checkout</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">
                {checkoutConversionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-100">
                {totalSalesFromCheckouts || 0} compras de {totalCheckoutViews || 0} visualizações
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados da campanha e financeiros */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <BarChart3 className="h-5 w-5" />
                Dados da Campanha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Investimento Total</div>
                  <div className="text-xl font-bold text-blue-800">{formatCurrency(debriefing.total_investment)}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Ticket Médio</div>
                  <div className="text-xl font-bold text-blue-800">{formatCurrency(ticketMedio)}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Leads Capturados</div>
                  <div className="text-xl font-bold text-blue-800">{debriefing.leads_captured || 0}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Vendas Realizadas</div>
                  <div className="text-xl font-bold text-blue-800">{totalSalesFromCheckouts || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-nexcrm-green/10 to-nexcrm-blue/10 border-nexcrm-green/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-nexcrm-green">
                <Users className="h-5 w-5" />
                Dados da Página
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Visualizações Totais</div>
                  <div className="text-xl font-bold text-purple-800">{debriefing.total_views || 0}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Visitantes Únicos</div>
                  <div className="text-xl font-bold text-purple-800">{debriefing.unique_visitors || 0}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Cliques em CTA</div>
                  <div className="text-xl font-bold text-purple-800">{debriefing.cta_clicks || 0}</div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Tempo Médio (seg)</div>
                  <div className="text-xl font-bold text-purple-800">{debriefing.avg_time_on_page || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Páginas */}
        {pages.length > 0 && (
          <Card className="border-2 border-dashed border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Eye className="h-5 w-5" />
                Páginas do Lançamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pages.map((page) => (
                  <div key={page.id} className="bg-white border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-foreground">{page.name}</h4>
                      {page.page_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(page.page_url, '_blank')}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visualizar
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <span className="text-blue-600 block text-sm font-medium">Visualizações</span>
                        <p className="font-bold text-xl text-blue-800">{page.total_views.toLocaleString()}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <span className="text-purple-600 block text-sm font-medium">Visitantes únicos</span>
                        <p className="font-bold text-xl text-purple-800">{page.unique_visitors.toLocaleString()}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <span className="text-orange-600 block text-sm font-medium">Cliques CTA</span>
                        <p className="font-bold text-xl text-orange-800">{page.cta_clicks.toLocaleString()}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <span className="text-green-600 block text-sm font-medium">Conversões</span>
                        <p className="font-bold text-xl text-green-800">{page.conversions.toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-lg">
                        <span className="text-emerald-600 block text-sm font-medium">Taxa conversão</span>
                        <p className="font-bold text-xl text-emerald-800">{page.conversion_rate?.toFixed(2)}%</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <span className="text-slate-600 block text-sm font-medium">Tempo médio</span>
                        <p className="font-medium text-slate-800">{Math.floor(page.avg_time_on_page / 60)}m {page.avg_time_on_page % 60}s</p>
                      </div>
                      {page.predominant_device && (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <span className="text-slate-600 block text-sm font-medium">Dispositivo</span>
                          <p className="font-medium text-slate-800">{page.predominant_device}</p>
                        </div>
                      )}
                      {page.predominant_traffic_source && (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <span className="text-slate-600 block text-sm font-medium">Fonte tráfego</span>
                          <p className="font-medium text-slate-800">{page.predominant_traffic_source}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checkouts */}
        {checkouts.length > 0 && (
          <Card className="border-2 border-dashed border-orange-200 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <ShoppingCart className="h-5 w-5" />
                Checkouts da Campanha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkouts.map((checkout) => {
                  const product = products.find(p => p.id === checkout.product_id);
                  return (
                    <div key={checkout.id} className="bg-white border rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-lg text-foreground">{checkout.name}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            {checkout.platform && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                                {checkout.platform}
                              </Badge>
                            )}
                            {product && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                                {product.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {checkout.checkout_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(checkout.checkout_url, '_blank')}
                            className="border-orange-200 text-orange-600 hover:bg-orange-50"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visualizar
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <span className="text-blue-600 block text-sm font-medium">Visualizações</span>
                          <p className="font-bold text-xl text-blue-800">{checkout.total_views.toLocaleString()}</p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg">
                          <span className="text-indigo-600 block text-sm font-medium">Iniciados</span>
                          <p className="font-bold text-xl text-indigo-800">{checkout.checkout_starts.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <span className="text-red-600 block text-sm font-medium">Abandonos</span>
                          <p className="font-bold text-xl text-red-800">{checkout.checkout_abandonments.toLocaleString()}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <span className="text-green-600 block text-sm font-medium">Finalizados</span>
                          <p className="font-bold text-xl text-green-800">{checkout.completed_purchases.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                        <div className="bg-emerald-50 p-3 rounded-lg">
                          <span className="text-emerald-600 block text-sm font-medium">Taxa de Conversão</span>
                          <p className="font-bold text-xl text-emerald-800">{checkout.conversion_rate.toFixed(2)}%</p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-lg">
                          <span className="text-red-700 block text-sm font-medium">Taxa de Abandono</span>
                          <p className="font-bold text-xl text-red-900">{checkout.abandonment_rate.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Anúncios */}
        {ads.length > 0 && (
          <Card className="border-2 border-dashed border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Target className="h-5 w-5" />
                Anúncios da Campanha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ads.map((ad) => (
                  <div key={ad.id} className="bg-white border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-foreground">{ad.ad_name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">{ad.platform}</Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">{ad.ad_type}</Badge>
                        </div>
                      </div>
                      {ad.view_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(ad.view_link, '_blank')}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Ver Criativo
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Gasto Total</span>
                        <p className="font-medium text-lg">{formatCurrency(ad.total_spent)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Leads</span>
                        <p className="font-medium text-lg">{ad.leads_generated}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Vendas</span>
                        <p className="font-medium text-lg">{ad.sales_generated}</p>
                      </div>
                      {ad.ctr && (
                        <div>
                          <span className="text-muted-foreground block">CTR</span>
                          <p className="font-medium text-lg">{ad.ctr}%</p>
                        </div>
                      )}
                      {ad.cpc && (
                        <div>
                          <span className="text-muted-foreground block">CPC</span>
                          <p className="font-medium text-lg">{formatCurrency(ad.cpc)}</p>
                        </div>
                      )}
                      {ad.cpm && (
                        <div>
                          <span className="text-muted-foreground block">CPM</span>
                          <p className="font-medium text-lg">{formatCurrency(ad.cpm)}</p>
                        </div>
                      )}
                    </div>
                    
                    {ad.observations && (
                      <div className="mt-4 pt-4 border-t">
                        <span className="text-muted-foreground block mb-1">Observações</span>
                        <p className="text-sm">{ad.observations}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Produtos Vendidos */}
        {debriefingProducts.length > 0 && (
          <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ShoppingCart className="h-5 w-5" />
                Produtos Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {debriefingProducts.map((item) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <div key={item.id} className="bg-white rounded-lg p-4 border shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-foreground">
                            {product?.name || 'Produto não encontrado'}
                          </h4>
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-muted-foreground block">Quantidade</span>
                              <p className="font-medium text-lg">{item.quantity_sold}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Valor Unitário</span>
                              <p className="font-medium text-lg">{formatCurrency(item.unit_price)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Total</span>
                              <p className="font-bold text-lg text-primary">{formatCurrency(item.total_revenue)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-4 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-muted-foreground">Faturamento Total dos Produtos:</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(debriefingProducts.reduce((sum, item) => sum + item.total_revenue, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Análise qualitativa */}
        {(debriefing.what_happened || debriefing.what_worked || debriefing.what_could_improve || debriefing.next_steps) && (
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-700">
                <Lightbulb className="h-5 w-5" />
                Análise Qualitativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">{/* ... keep existing code */}
              {debriefing.what_happened && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">O que aconteceu?</h4>
                  <p className="text-muted-foreground">{debriefing.what_happened}</p>
                </div>
              )}
              
              {debriefing.what_worked && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">O que funcionou?</h4>
                  <p className="text-muted-foreground">{debriefing.what_worked}</p>
                </div>
              )}
              
              {debriefing.what_could_improve && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">O que pode melhorar?</h4>
                  <p className="text-muted-foreground">{debriefing.what_could_improve}</p>
                </div>
              )}
              
              {debriefing.next_steps && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">Próximos passos</h4>
                  <p className="text-muted-foreground">{debriefing.next_steps}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DebriefingView;