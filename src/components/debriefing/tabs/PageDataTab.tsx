import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';

interface PageDataTabProps {
  form: UseFormReturn<any>;
  onSave: (data: any) => void;
}

export const PageDataTab = ({ form }: PageDataTabProps) => {
  const watchedValues = form.watch();
  const conversionRate = (watchedValues.conversions && watchedValues.unique_visitors) 
    ? (watchedValues.conversions / watchedValues.unique_visitors * 100).toFixed(2)
    : '0.00';

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Página</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="page_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Página</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="total_views"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visualizações Totais</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unique_visitors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visitantes Únicos</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conversions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversões</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Taxa de Conversão</div>
              <div className="text-2xl font-bold text-primary">{conversionRate}%</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
};