
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Calendar,
  BarChart3
} from "lucide-react";

const Dashboard = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-nexcrm-blue/5 via-white to-nexcrm-green/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Dashboard Dinâmica
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Acompanhe KPIs relevantes para seu marketing em uma dashboard visual e conectada aos dados reais do CRM
          </p>
        </div>
        
        <div className="max-w-6xl mx-auto">
          {/* Main Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total de Leads</p>
                    <p className="text-3xl font-bold text-gray-800">1,247</p>
                    <p className="text-sm text-nexcrm-green flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +12.5% este mês
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-nexcrm-blue/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-nexcrm-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Conversões</p>
                    <p className="text-3xl font-bold text-gray-800">187</p>
                    <p className="text-sm text-nexcrm-green flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +8.3% este mês
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-nexcrm-green/10 rounded-lg flex items-center justify-center">
                    <Target className="h-6 w-6 text-nexcrm-green" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Receita</p>
                    <p className="text-3xl font-bold text-gray-800">R$ 284k</p>
                    <p className="text-sm text-nexcrm-green flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +15.2% este mês
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-nexcrm-blue/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-nexcrm-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Taxa de Conversão</p>
                    <p className="text-3xl font-bold text-gray-800">15.0%</p>
                    <p className="text-sm text-nexcrm-green flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +2.1% este mês
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-nexcrm-green/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-nexcrm-green" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Performance by UTM Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-nexcrm-blue" />
                  Performance por Origem (UTM)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Facebook Ads</span>
                      <Badge className="bg-nexcrm-blue/10 text-nexcrm-blue">426 leads</Badge>
                    </div>
                    <Progress value={85} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Taxa de conversão: 18.2%</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Google Ads</span>
                      <Badge className="bg-nexcrm-green/10 text-nexcrm-green">312 leads</Badge>
                    </div>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Taxa de conversão: 22.1%</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Instagram</span>
                      <Badge className="bg-nexcrm-blue/10 text-nexcrm-blue">198 leads</Badge>
                    </div>
                    <Progress value={45} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Taxa de conversão: 12.8%</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Email Marketing</span>
                      <Badge className="bg-nexcrm-green/10 text-nexcrm-green">156 leads</Badge>
                    </div>
                    <Progress value={35} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Taxa de conversão: 28.4%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-nexcrm-green" />
                  Atividades Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-nexcrm-green rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Lead convertido</p>
                      <p className="text-xs text-gray-500">João Silva - Facebook Ads • R$ 2.500</p>
                      <p className="text-xs text-gray-400">há 5 minutos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-nexcrm-blue rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Novo lead capturado</p>
                      <p className="text-xs text-gray-500">Maria Costa - Google Ads • utm_campaign=search-keywords</p>
                      <p className="text-xs text-gray-400">há 12 minutos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Tarefa criada</p>
                      <p className="text-xs text-gray-500">Ligar para Pedro Santos - Follow-up proposta</p>
                      <p className="text-xs text-gray-400">há 1 hora</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-nexcrm-green/70 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Webhook recebido</p>
                      <p className="text-xs text-gray-500">Elementor Form - Landing Page "Curso de Marketing"</p>
                      <p className="text-xs text-gray-400">há 2 horas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
