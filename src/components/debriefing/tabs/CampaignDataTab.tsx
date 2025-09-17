import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from '@/components/ui/form';

interface CampaignDataTabProps {
  form: UseFormReturn<any>;
  onSave: (data: any) => void;
}

const formatCurrency = (value?: number) => {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const CampaignDataTab = ({ form }: CampaignDataTabProps) => {
  const watchedValues = form.watch();
  
  // Cálculos automáticos
  const ticketMedio = (watchedValues.gross_revenue && watchedValues.sales_made) 
    ? watchedValues.gross_revenue / watchedValues.sales_made 
    : 0;
    
  const cpl = (watchedValues.total_investment && watchedValues.leads_captured)
    ? watchedValues.total_investment / watchedValues.leads_captured
    : 0;
    
  const cpa = (watchedValues.total_investment && watchedValues.sales_made)
    ? watchedValues.total_investment / watchedValues.sales_made
    : 0;

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Investimento e Faturamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="total_investment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investimento Total (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="0,00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gross_revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faturamento Bruto (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="0,00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Faturamento Líquido (R$)</FormLabel>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Calculado automaticamente: Faturamento Bruto - (Custo Fixo + Impostos)
                  </p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      const grossRevenue = form.watch('gross_revenue') || 0;
                      const fixedCost = 0; // Será calculado com base nas configurações
                      const taxRate = 0; // Será calculado com base nas configurações
                      const taxes = grossRevenue * (taxRate / 100);
                      const netRevenue = grossRevenue - (fixedCost + taxes);
                      return `R$ ${netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads e Vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leads_captured"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leads Captados</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sales_made"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendas Realizadas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas Calculadas Automaticamente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Ticket Médio</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(ticketMedio)}
                </div>
              </div>

              <div className="p-4 bg-accent rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">CPL (Custo por Lead)</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(cpl)}
                </div>
              </div>

              <div className="p-4 bg-accent rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">CPA (Custo por Aquisição)</div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(cpa)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
};