
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, DollarSign } from "lucide-react";

const PipelineDemo = () => {
  const pipelineStages = [
    {
      title: "Novos Leads",
      count: 12,
      color: "bg-blue-500",
      leads: [
        { name: "João Silva", source: "Facebook Ads", value: "R$ 2.500", utm: "facebook-campaign-01" },
        { name: "Maria Costa", source: "Google Ads", value: "R$ 1.800", utm: "google-search-keywords" },
        { name: "Pedro Santos", source: "Instagram", value: "R$ 3.200", utm: "instagram-stories-promo" }
      ]
    },
    {
      title: "Qualificação",
      count: 8,
      color: "bg-yellow-500",
      leads: [
        { name: "Ana Oliveira", source: "Email Marketing", value: "R$ 4.500", utm: "email-newsletter-march" },
        { name: "Carlos Lima", source: "LinkedIn Ads", value: "R$ 6.800", utm: "linkedin-b2b-campaign" }
      ]
    },
    {
      title: "Proposta",
      count: 5,
      color: "bg-orange-500",
      leads: [
        { name: "Luciana Ferreira", source: "Indicação", value: "R$ 8.900", utm: "referral-program" },
        { name: "Roberto Alves", source: "Webinar", value: "R$ 5.400", utm: "webinar-conversion-funnel" }
      ]
    },
    {
      title: "Fechamento",
      count: 3,
      color: "bg-green-500",
      leads: [
        { name: "Fernanda Rocha", source: "Facebook Ads", value: "R$ 12.000", utm: "facebook-retargeting-q1" }
      ]
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Pipeline Inteligente em Ação
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Visualize como o Glav organiza seus leads com rastreamento completo de UTMs e origem de tráfego
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {pipelineStages.map((stage, stageIndex) => (
            <div key={stageIndex} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{stage.title}</h3>
                <Badge className={`${stage.color} text-white`}>
                  {stage.count}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {stage.leads.map((lead, leadIndex) => (
                  <Card key={leadIndex} className="hover:shadow-md transition-shadow cursor-pointer border-l-4" style={{ borderLeftColor: stage.color.replace('bg-', '') === 'blue-500' ? '#3b82f6' : stage.color.replace('bg-', '') === 'yellow-500' ? '#eab308' : stage.color.replace('bg-', '') === 'orange-500' ? '#f97316' : '#10b981' }}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-sm">{lead.name?.charAt(0).toUpperCase() + lead.name?.slice(1).toLowerCase() || "Lead sem nome"}</span>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          <strong>Origem:</strong> {lead.source}
                        </div>
                        
                        <div className="text-xs text-blue-600 font-mono bg-blue-50 p-1 rounded">
                          UTM: {lead.utm}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">{lead.value}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">Hoje</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            ✨ <strong>Drag & Drop intuitivo</strong> • <strong>Rastreamento de UTMs em tempo real</strong> • <strong>Histórico completo de interações</strong>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PipelineDemo;
