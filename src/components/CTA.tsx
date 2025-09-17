
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, Headphones } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center text-white mb-16">
          <Badge className="mb-6 bg-white/20 text-white hover:bg-white/30 border-white/30">
            ✨ Oferta de Lançamento
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Comece a usar o Glan hoje mesmo
          </h2>
          
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
            Transforme a forma como você gerencia seus leads e campanhas de marketing digital. 
            O CRM que o seu negócio digital estava esperando.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
              Começar Gratuitamente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg">
              Agendar Demonstração
            </Button>
          </div>
          
          <div className="text-blue-100 text-sm">
            🔗 <span className="text-white font-medium">www.glan.com.br</span> • Sem compromisso • Sem cartão de crédito
          </div>
        </div>
        
        {/* Benefits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center text-white">
              <Zap className="h-8 w-8 mx-auto mb-4 text-yellow-300" />
              <h3 className="font-semibold mb-2">Setup Rápido</h3>
              <p className="text-sm text-blue-100">
                Configure em minutos e comece a rastrear leads imediatamente
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center text-white">
              <Shield className="h-8 w-8 mx-auto mb-4 text-green-300" />
              <h3 className="font-semibold mb-2">Dados Seguros</h3>
              <p className="text-sm text-blue-100">
                Criptografia de ponta e backup automático dos seus dados
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center text-white">
              <Headphones className="h-8 w-8 mx-auto mb-4 text-pink-300" />
              <h3 className="font-semibold mb-2">Suporte Premium</h3>
              <p className="text-sm text-blue-100">
                Time especializado em marketing digital para te ajudar
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full opacity-50 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/5 rounded-full opacity-30 animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full opacity-40 animate-pulse delay-500" />
    </section>
  );
};

export default CTA;
