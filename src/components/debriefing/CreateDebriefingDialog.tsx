import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FileText, TrendingUp, Globe, CreditCard, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebriefings } from '@/hooks/useDebriefings';
import { QualitativeTab } from './tabs/QualitativeTab';
import { CampaignDataTab } from './tabs/CampaignDataTab';
import { PageDataTab } from './tabs/PageDataTab';

import { AdsTab } from './tabs/AdsTab';

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
  page_url: z.string().optional(),
  total_views: z.number().optional(),
  unique_visitors: z.number().optional(),
  cta_clicks: z.number().optional(),
  conversions: z.number().optional(),
  avg_time_on_page: z.number().optional(),
  predominant_device: z.string().optional(),
  predominant_traffic_source: z.string().optional(),
  checkout_views: z.number().optional(),
  checkout_starts: z.number().optional(),
  checkout_abandonments: z.number().optional(),
  completed_purchases: z.number().optional(),
  abandonment_reasons: z.string().optional(),
  checkout_platform: z.string().optional(),
});

type DebriefingFormData = z.infer<typeof debriefingSchema>;

interface CreateDebriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateDebriefingDialog = ({ open, onOpenChange }: CreateDebriefingDialogProps) => {
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
    if (!data.project_name || !data.campaign_type) return;
    try {
      const result = await createDebriefing.mutateAsync(data as any);
      if (result?.id) {
        setCreatedDebriefingId(result.id);
      }
    } catch (error) {
      console.error('Erro ao salvar debriefing:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setActiveTab('qualitative');
    setCreatedDebriefingId(null);
    onOpenChange(false);
  };

  const tabs = [
    { id: 'qualitative', label: 'Análise Qualitativa', icon: FileText },
    { id: 'campaign', label: 'Dados da Campanha', icon: TrendingUp },
    { id: 'page', label: 'Dados da Página', icon: Globe },
    { id: 'ads', label: 'Anúncios', icon: Megaphone },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Debriefing Estratégico
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
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

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="qualitative" className="mt-4">
                <QualitativeTab form={form} onSave={handleSave} />
              </TabsContent>

              <TabsContent value="campaign" className="mt-4">
                <CampaignDataTab form={form} onSave={handleSave} />
              </TabsContent>

              <TabsContent value="page" className="mt-4">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Salve o debriefing primeiro para adicionar páginas
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="ads" className="mt-4">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Salve o debriefing primeiro para adicionar anúncios
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => handleSave(form.getValues())}
              disabled={createDebriefing.isPending}
            >
              Salvar Rascunho
            </Button>
            <Button 
              onClick={() => handleSave(form.getValues())}
              disabled={createDebriefing.isPending}
            >
              Salvar Debriefing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};