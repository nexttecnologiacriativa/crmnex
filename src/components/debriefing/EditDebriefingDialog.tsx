import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, FileText, TrendingUp, Globe, CreditCard, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebriefings, Debriefing } from '@/hooks/useDebriefings';
import { QualitativeTab } from './tabs/QualitativeTab';
import { CampaignDataTab } from './tabs/CampaignDataTab';

import { PagesTab } from './PagesTab';
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

interface EditDebriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debriefing: Debriefing;
  onClose: () => void;
}

export const EditDebriefingDialog = ({ 
  open, 
  onOpenChange, 
  debriefing, 
  onClose 
}: EditDebriefingDialogProps) => {
  const [activeTab, setActiveTab] = useState('qualitative');
  const { updateDebriefing } = useDebriefings();

  const form = useForm<DebriefingFormData>({
    resolver: zodResolver(debriefingSchema),
    defaultValues: {
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
      page_url: debriefing.page_url || '',
      total_views: debriefing.total_views || undefined,
      unique_visitors: debriefing.unique_visitors || undefined,
      cta_clicks: debriefing.cta_clicks || undefined,
      conversions: debriefing.conversions || undefined,
      avg_time_on_page: debriefing.avg_time_on_page || undefined,
      predominant_device: debriefing.predominant_device || '',
      predominant_traffic_source: debriefing.predominant_traffic_source || '',
      checkout_views: debriefing.checkout_views || undefined,
      checkout_starts: debriefing.checkout_starts || undefined,
      checkout_abandonments: debriefing.checkout_abandonments || undefined,
      completed_purchases: debriefing.completed_purchases || undefined,
      abandonment_reasons: debriefing.abandonment_reasons || '',
      checkout_platform: debriefing.checkout_platform || '',
    },
  });

  const handleSave = async (data: DebriefingFormData) => {
    try {
      await updateDebriefing.mutateAsync({
        id: debriefing.id,
        ...data,
      });
    } catch (error) {
      console.error('Erro ao atualizar debriefing:', error);
    }
  };

  const handleClose = () => {
    setActiveTab('qualitative');
    onClose();
  };

  const tabs = [
    { id: 'qualitative', label: 'Análise Qualitativa', icon: FileText },
    { id: 'campaign', label: 'Dados da Campanha', icon: TrendingUp },
    { id: 'page', label: 'Dados da Página', icon: Globe },
    { id: 'ads', label: 'Anúncios', icon: Megaphone },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {debriefing.project_name}
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
                <PagesTab debriefingId={debriefing.id} />
              </TabsContent>

              <TabsContent value="ads" className="mt-4">
                <AdsTab debriefingId={debriefing.id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <Button 
            onClick={() => handleSave(form.getValues())}
            disabled={updateDebriefing.isPending}
          >
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};