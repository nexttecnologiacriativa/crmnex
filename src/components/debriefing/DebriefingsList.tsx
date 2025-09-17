import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Copy, Download, Calendar, User, TrendingUp, LayoutGrid, List, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Debriefing } from '@/hooks/useDebriefings';

interface DebriefingsListProps {
  debriefings: Debriefing[];
  isLoading: boolean;
  onView?: (debriefing: Debriefing) => void;
}

const campaignTypeLabels = {
  semente: 'Semente',
  interno: 'Interno',
  desafio: 'Desafio',
  perpetuo: 'Perpétuo',
  campanha: 'Campanha',
  outro: 'Outro',
};

const campaignTypeColors = {
  semente: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  interno: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  desafio: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  perpetuo: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  campanha: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  outro: 'bg-muted text-muted-foreground border-border',
};

const formatCurrency = (value?: number) => {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const calculateMetrics = (debriefing: Debriefing) => {
  const ticketMedio = debriefing.sales_made && debriefing.gross_revenue 
    ? debriefing.gross_revenue / debriefing.sales_made 
    : 0;
  
  const cpl = debriefing.leads_captured && debriefing.total_investment
    ? debriefing.total_investment / debriefing.leads_captured
    : 0;
    
  const cpa = debriefing.sales_made && debriefing.total_investment
    ? debriefing.total_investment / debriefing.sales_made
    : 0;

  // Conversão do lançamento (leads para vendas)
  const conversionRate = debriefing.leads_captured && debriefing.sales_made
    ? (debriefing.sales_made / debriefing.leads_captured) * 100
    : 0;

  // Conversão da página (visitantes únicos para conversões)
  const pageConversionRate = debriefing.unique_visitors && debriefing.conversions
    ? (debriefing.conversions / debriefing.unique_visitors) * 100
    : 0;

  // Conversão do checkout (visualizações para compras)
  const checkoutConversionRate = debriefing.checkout_views && debriefing.completed_purchases
    ? (debriefing.completed_purchases / debriefing.checkout_views) * 100
    : 0;

  return { 
    ticketMedio, 
    cpl, 
    cpa, 
    conversionRate, 
    pageConversionRate, 
    checkoutConversionRate 
  };
};

export const DebriefingsList = ({ debriefings, isLoading, onView }: DebriefingsListProps) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');

  const handleEdit = (debriefing: Debriefing) => {
    navigate(`/debriefing/${debriefing.id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (debriefings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum debriefing encontrado
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Comece criando seu primeiro debriefing estratégico para documentar 
            e analisar suas campanhas e lançamentos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderListView = () => (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projeto</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPL</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conv. Lançamento</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conv. Página</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conv. Checkout</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {debriefings.map((debriefing) => {
              const { ticketMedio, cpl, cpa, conversionRate, pageConversionRate, checkoutConversionRate } = calculateMetrics(debriefing);
              
              return (
                <tr key={debriefing.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-foreground">{debriefing.project_name}</div>
                    {debriefing.responsible && (
                      <div className="text-sm text-muted-foreground">{debriefing.responsible}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant="secondary" 
                      className={`${campaignTypeColors[debriefing.campaign_type as keyof typeof campaignTypeColors]}`}
                    >
                      {campaignTypeLabels[debriefing.campaign_type as keyof typeof campaignTypeLabels]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {debriefing.start_date && format(new Date(debriefing.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                    {debriefing.start_date && debriefing.end_date && ' - '}
                    {debriefing.end_date && format(new Date(debriefing.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(debriefing.gross_revenue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-nexcrm-green">
                      {cpl > 0 ? formatCurrency(cpl) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">
                      {conversionRate > 0 ? `${conversionRate.toFixed(1)}%` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-purple-600">
                      {pageConversionRate > 0 ? `${pageConversionRate.toFixed(1)}%` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-orange-600">
                      {checkoutConversionRate > 0 ? `${checkoutConversionRate.toFixed(1)}%` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onView?.(debriefing)}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(debriefing)}
                        className="hover:bg-premium-purple hover:text-white transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCardView = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {debriefings.map((debriefing) => {
        const { ticketMedio, cpl, cpa, conversionRate, pageConversionRate, checkoutConversionRate } = calculateMetrics(debriefing);
          
          return (
            <Card key={debriefing.id} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-premium-blue/5 rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold text-foreground line-clamp-2 leading-tight">
                      {debriefing.project_name}
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className={`mt-3 ${campaignTypeColors[debriefing.campaign_type as keyof typeof campaignTypeColors]} font-semibold px-3 py-1`}
                    >
                      {campaignTypeLabels[debriefing.campaign_type as keyof typeof campaignTypeLabels]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 p-6">
                {/* Período */}
                {(debriefing.start_date || debriefing.end_date) && (
                  <div className="flex items-center text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    <Calendar className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">
                      {debriefing.start_date && format(new Date(debriefing.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {debriefing.start_date && debriefing.end_date && ' - '}
                      {debriefing.end_date && format(new Date(debriefing.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}

                {/* Responsável */}
                {debriefing.responsible && (
                  <div className="flex items-center text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    <User className="h-4 w-4 mr-2 text-nexcrm-blue" />
                    <span className="font-medium">{debriefing.responsible}</span>
                  </div>
                )}

                {/* Métricas principais */}
                <div className="space-y-3 bg-gradient-to-br from-muted/20 to-accent/20 rounded-lg p-4">
                  {debriefing.gross_revenue && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Faturamento:</span>
                      <span className="font-bold text-green-600 text-base">
                        {formatCurrency(debriefing.gross_revenue)}
                      </span>
                    </div>
                  )}
                  
                  {cpl > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">CPL:</span>
                      <span className="font-bold text-nexcrm-green text-base">
                        {formatCurrency(cpl)}
                      </span>
                    </div>
                  )}
                  
                  {conversionRate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Conv. Lançamento:</span>
                      <span className="font-bold text-blue-600 text-base">
                        {conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  
                  {pageConversionRate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Conv. Página:</span>
                      <span className="font-bold text-purple-600 text-base">
                        {pageConversionRate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  
                  {checkoutConversionRate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Conv. Checkout:</span>
                      <span className="font-bold text-orange-600 text-base">
                        {checkoutConversionRate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold"
                    onClick={() => onView?.(debriefing)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Visualizar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(debriefing)}
                    className="hover:bg-premium-purple hover:text-white transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );

  return (
    <>
      {/* Controles de visualização */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Cards
          </Button>
        </div>
        
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Conteúdo baseado no modo de visualização */}
      {viewMode === 'list' ? renderListView() : renderCardView()}
    </>
  );
};