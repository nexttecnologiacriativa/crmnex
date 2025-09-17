import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FileText, TrendingUp, ShoppingBag, Globe, CreditCard, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebriefings } from '@/hooks/useDebriefings';
import { QualitativeTab } from '@/components/debriefing/tabs/QualitativeTab';
import { CampaignDataTab } from '@/components/debriefing/tabs/CampaignDataTab';

import { ProductsTabSeparate } from '@/components/debriefing/ProductsTabSeparate';
import { PagesTab } from '@/components/debriefing/PagesTab';
import { CheckoutsTab } from '@/components/debriefing/CheckoutsTab';
import { AdsTab } from '@/components/debriefing/tabs/AdsTab';
import DashboardLayout from '@/components/layout/DashboardLayout';

const debriefingSchema = z.object({
  project_name: z.string().min(1, 'Nome do projeto é obrigatório'),
  campaign_type: z.enum(['semente', 'interno', 'desafio', 'perpetuo', 'campanha', 'outro']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  responsible: z.string().optional(),
  what_happened: z.string().optional(),
  what_worked: z.string().optional(),
  what_could_improve: z.string().optional(),
  next_steps: z.string().optional(),
  total_investment: z.number().optional(),
  gross_revenue: z.number().optional(),
  net_revenue: z.number().optional(),
  leads_captured: z.number().optional(),
  sales_made: z.number().optional(),
  checkout_views: z.number().optional(),
  checkout_starts: z.number().optional(),
  checkout_abandonments: z.number().optional(),
  completed_purchases: z.number().optional(),
  abandonment_reasons: z.string().optional(),
  checkout_platform: z.string().optional(),
});

type DebriefingFormData = z.infer<typeof debriefingSchema>;

const DebriefingEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('qualitative');
  const { debriefings, updateDebriefing, isLoading } = useDebriefings();

  const debriefing = debriefings.find(d => d.id === id);

  const form = useForm<DebriefingFormData>({
    resolver: zodResolver(debriefingSchema),
    defaultValues: debriefing ? {
      project_name: debriefing.project_name,
      campaign_type: debriefing.campaign_type as any,
      start_date: debriefing.start_date || '',
      end_date: debriefing.end_date || '',
      responsible: debriefing.responsible || '',
      what_happened: debriefing.what_happened || '',
      what_worked: debriefing.what_worked || '',
      what_could_improve: debriefing.what_could_improve || '',
      next_steps: debriefing.next_steps || '',
      total_investment: debriefing.total_investment || undefined,
      gross_revenue: debriefing.gross_revenue || undefined,
      net_revenue: debriefing.net_revenue || undefined,
      leads_captured: debriefing.leads_captured || undefined,
      sales_made: debriefing.sales_made || undefined,
      checkout_views: debriefing.checkout_views || undefined,
      checkout_starts: debriefing.checkout_starts || undefined,
      checkout_abandonments: debriefing.checkout_abandonments || undefined,
      completed_purchases: debriefing.completed_purchases || undefined,
      abandonment_reasons: debriefing.abandonment_reasons || '',
      checkout_platform: debriefing.checkout_platform || '',
    } : {},
  });

  const handleSave = async (data: DebriefingFormData) => {
    if (!debriefing) return;
    try {
      await updateDebriefing.mutateAsync({
        id: debriefing.id,
        ...data,
      });
    } catch (error) {
      console.error('Erro ao atualizar debriefing:', error);
    }
  };

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

  const tabs = [
    { id: 'qualitative', label: 'Qualitativa', icon: FileText },
    { id: 'campaign', label: 'Campanha', icon: TrendingUp },
    { id: 'products', label: 'Produtos', icon: ShoppingBag },
    { id: 'pages', label: 'Páginas', icon: Globe },
    { id: 'checkouts', label: 'Checkouts', icon: CreditCard },
    { id: 'ads', label: 'Anúncios', icon: Megaphone },
  ];

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
            <h1 className="text-3xl font-bold text-foreground">Editar: {debriefing.project_name}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card border rounded-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-6 rounded-none border-b">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-6">
              <TabsContent value="qualitative" className="mt-0">
                <QualitativeTab form={form} onSave={handleSave} />
              </TabsContent>

              <TabsContent value="campaign" className="mt-0">
                <CampaignDataTab form={form} onSave={handleSave} />
              </TabsContent>

              <TabsContent value="products" className="mt-0">
                <ProductsTabSeparate debriefingId={debriefing.id} />
              </TabsContent>

              <TabsContent value="pages" className="mt-0">
                <PagesTab debriefingId={debriefing.id} />
              </TabsContent>

              <TabsContent value="checkouts" className="mt-0">
                <CheckoutsTab debriefingId={debriefing.id} />
              </TabsContent>

              <TabsContent value="ads" className="mt-0">
                <AdsTab debriefingId={debriefing.id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <Button 
            onClick={() => handleSave(form.getValues())}
            disabled={updateDebriefing.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {updateDebriefing.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DebriefingEdit;