
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building, 
  Target, 
  Rocket, 
  GraduationCap, 
  Briefcase 
} from "lucide-react";

const TargetAudience = () => {
  const audiences = [
    {
      icon: Building,
      title: "Agências de marketing digital",
      description: "Gerencie múltiplos clientes com workspaces separados e relatórios personalizados"
    },
    {
      icon: Target,
      title: "Gestores de tráfego pago",
      description: "Rastreie performance de campanhas com UTMs completas e ROI em tempo real"
    },
    {
      icon: Rocket,
      title: "Lançadores e coprodutores",
      description: "Acompanhe conversões de funis e maximize resultados de lançamentos"
    },
    {
      icon: GraduationCap,
      title: "Infoprodutores",
      description: "Gerencie leads de cursos online e automatize processos de vendas"
    },
    {
      icon: Briefcase,
      title: "PMEs com marketing digital",
      description: "Centralize todos os leads e acompanhe o retorno dos investimentos em marketing"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Quem deve usar o NexCRM?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            O NexCRM nasceu para ser o CRM que o marketing digital sempre pediu: simples, visual, conectado e com rastreamento de resultados de ponta a ponta.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {audiences.map((audience, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <audience.icon className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-gray-800">
                  {audience.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  {audience.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TargetAudience;
