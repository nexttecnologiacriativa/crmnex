
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Target, 
  Users, 
  Workflow, 
  BarChart3, 
  CheckSquare, 
  Webhook,
  Building2,
  TrendingUp 
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Target,
      title: "Rastreamento completo de UTMs",
      description: "Capture e registre automaticamente todas as UTMs (source, medium, campaign, term, content) de cada lead, permitindo análises precisas sobre a performance de cada campanha.",
      color: "text-blue-600"
    },
    {
      icon: Users,
      title: "Gestão de Leads Inteligente",
      description: "Adicione, qualifique e acompanhe leads com facilidade. Visualize em tempo real a origem de cada contato e seu histórico de interação.",
      color: "text-green-600"
    },
    {
      icon: Workflow,
      title: "Pipelines Personalizáveis",
      description: "Crie pipelines de vendas totalmente personalizáveis com etapas que fazem sentido para o seu funil digital. Movimente os cards com drag & drop intuitivo.",
      color: "text-purple-600"
    },
    {
      icon: BarChart3,
      title: "Dashboard Dinâmica",
      description: "Acompanhe KPIs relevantes para seu marketing em uma dashboard visual e conectada aos dados reais do CRM.",
      color: "text-orange-600"
    },
    {
      icon: CheckSquare,
      title: "Tarefas e Automação de Fluxos",
      description: "Crie tarefas associadas aos leads, defina lembretes e automatize etapas de acompanhamento.",
      color: "text-red-600"
    },
    {
      icon: Webhook,
      title: "Webhooks Nativos",
      description: "Conecte o Glan às suas ferramentas de automação e landing pages com webhooks reais e funcionais, facilitando integrações.",
      color: "text-indigo-600"
    },
    {
      icon: Building2,
      title: "Multiusuário e Multiworkspace",
      description: "Ideal para agências e times de vendas: tenha múltiplos workspaces e usuários, com permissões personalizadas.",
      color: "text-teal-600"
    },
    {
      icon: TrendingUp,
      title: "Relatórios e Insights de Marketing",
      description: "Acompanhe a performance de campanhas, conversões e ROI com relatórios claros e personalizáveis.",
      color: "text-pink-600"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            🚀 Principais Diferenciais
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            O Glan vai muito além de um simples CRM de contatos: ele é uma plataforma pensada para rastrear, analisar e maximizar conversões de leads em vendas.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg text-gray-800">
                  ✅ {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
