import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FileText, TrendingUp, ShoppingBag, Globe, CreditCard, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebriefings } from '@/hooks/useDebriefings';
import { QualitativeTab } from '@/components/debriefing/tabs/QualitativeTab';
import { CampaignDataTab } from '@/components/debriefing/tabs/CampaignDataTab';
import { CheckoutDataMultiple } from '@/components/debriefing/tabs/CheckoutDataMultiple';
import { ProductsTab } from '@/components/debriefing/ProductsTab';
import { PagesTab } from '@/components/debriefing/PagesTab';
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

const DebriefingCreate = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('qualitative');
  const [createdDebriefingId, setCreatedDebriefingId] = useState<string | null>(null);
  const { createDebriefing } = useDebriefings();

  const form = useForm<DebriefingFormData>({
    resolver: zodResolver(debriefingSchema),
    defaultValues: {
      campaign_type: 'campanha',
    },
  });

  const handleSave = async (data: DebriefingFormData) => {
    if (!data.project_name) {
      return;
    }
    
    try {
      const result = await createDebriefing.mutateAsync({
        ...data,
        project_name: data.project_name,
        campaign_type: data.campaign_type || 'campanha',
      });
      if (result && !createdDebriefingId) {
        setCreatedDebriefingId(result.id);
      }
    } catch (error) {
      console.error('Erro ao criar debriefing:', error);
    }
  };

  const tabs = [
    { id: 'qualitative', label: 'Qualitativa', icon: FileText },
    { id: 'campaign', label: 'Campanha', icon: TrendingUp },
    { id: 'products', label: 'Produtos', icon: ShoppingBag },
    { id: 'pages', label: 'Páginas', icon: Globe },
    { id: 'checkout', label: 'Checkout', icon: CreditCard },
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
            <h1 className="text-3xl font-bold text-foreground">Novo Debriefing</h1>
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
                <ProductsTab debriefingId={createdDebriefingId} />
              </TabsContent>

              <TabsContent value="pages" className="mt-0">
                <PagesTab debriefingId={createdDebriefingId} />
              </TabsContent>

              <TabsContent value="checkout" className="mt-0">
                <CheckoutDataMultiple debriefingId={createdDebriefingId} />
              </TabsContent>

              <TabsContent value="ads" className="mt-0">
                <AdsTab debriefingId={createdDebriefingId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <Button 
            onClick={() => handleSave(form.getValues())}
            disabled={createDebriefing.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createDebriefing.isPending ? "Salvando..." : "Salvar Debriefing"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DebriefingCreate;