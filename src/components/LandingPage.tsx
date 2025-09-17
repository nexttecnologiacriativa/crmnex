import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, MessageCircle, BarChart3, Zap, Shield, Target, CheckCircle, Star, Menu, X } from "lucide-react";
import { useState } from "react";
const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleLoginClick = () => {
    window.location.href = '/auth';
  };
  const handleCTAClick = () => {
    const message = encodeURIComponent("Quero saber mais sobre o Glav");
    window.open(`https://wa.me/5512974012534?text=${message}`, '_blank');
  };
  const features = [{
    icon: Users,
    title: "Gestão de Leads",
    description: "Capture, organize e gerencie todos os seus leads em um só lugar com pipelines personalizáveis."
  }, {
    icon: Target,
    title: "UTM Tracking",
    description: "Rastreie suas campanhas com precisão e veja exatamente de onde vêm seus melhores leads."
  }, {
    icon: MessageCircle,
    title: "WhatsApp Business",
    description: "Integração completa com WhatsApp oficial para disparos em massa e atendimento automatizado."
  }, {
    icon: BarChart3,
    title: "Relatórios Avançados",
    description: "Analise performance, ROI e tome decisões baseadas em dados reais do seu negócio."
  }, {
    icon: Zap,
    title: "Automações",
    description: "Fluxos inteligentes que nutrem seus leads automaticamente e aumentam suas conversões."
  }, {
    icon: Shield,
    title: "Segurança Total",
    description: "Seus dados protegidos com a mais alta segurança e conformidade com LGPD."
  }];
  const benefits = ["Aumente suas conversões em até 300%", "Economize 20+ horas por semana", "Integração com Meta Ads e Google Ads", "Suporte especializado 24/7", "Templates de mensagens prontos", "Dashboard em tempo real"];
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/lovable-uploads/10da2fd3-a456-45e5-b211-452502c616f7.png" alt="Glav Logo" className="h-10" />
              
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Funcionalidades</a>
              <a href="#benefits" className="text-muted-foreground hover:text-primary transition-colors">Benefícios</a>
              
              <Button onClick={handleCTAClick} className="bg-primary hover:bg-primary/90">
                Falar com o Time
              </Button>
              <Button onClick={handleLoginClick} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                Login
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Funcionalidades</a>
                <a href="#benefits" className="text-muted-foreground hover:text-primary transition-colors">Benefícios</a>
                <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Preços</a>
                <Button onClick={handleCTAClick} className="bg-primary hover:bg-primary/90">
                  Falar com o Time
                </Button>
                <Button onClick={handleLoginClick} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  Login
                </Button>
              </div>
            </div>}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 bg-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
              🚀 O CRM do Futuro para Marketing Digital
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Transforme <span className="text-primary">Visitantes</span> em{" "}
              <span className="text-primary">Clientes</span> Reais
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              O CRM feito especialmente para negócios digitais. Gerencie leads, automatize vendas e 
              escale seu negócio com a plataforma que já converteu mais de R$ 50 milhões.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg" onClick={handleCTAClick}>
                Falar com o Time
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-primary text-primary hover:bg-primary/10" onClick={handleLoginClick}>
                Fazer Login
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="ml-2">+500 empresas confiam no Glav</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades completas para capturar, nutrir e converter seus leads em clientes pagantes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className="glass-card hover:scale-105 transition-all duration-300 border-primary/10">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Por que escolher o Glav?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Mais de 500 empresas já aumentaram suas vendas usando nossa plataforma. 
                Veja os resultados que você pode alcançar:
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>)}
              </div>

              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground mt-8" onClick={handleCTAClick}>
                Quero Estes Resultados
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="relative">
              <div className="glass-card p-8 border-primary/20">
                <h3 className="text-2xl font-bold text-foreground mb-6">Resultados Reais</h3>
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600">+300%</div>
                    <div className="text-green-700">Aumento em conversões</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">20h</div>
                    <div className="text-blue-700">Economizadas por semana</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">R$ 50M+</div>
                    <div className="text-purple-700">Em vendas geradas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para revolucionar suas vendas?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Junte-se a mais de 500 empresas que já estão vendendo mais com o Glav. 
            Comece hoje mesmo e veja a diferença em 7 dias.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg" onClick={handleCTAClick}>
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleCTAClick} className="border-white px-8 py-4 text-lg text-white bg-[#000a0e]/0">
              Falar com o Time
            </Button>
          </div>
          
          <p className="text-sm mt-6 opacity-75">
            Sem compromisso • Suporte 24/7 • Implementação gratuita
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img src="/lovable-uploads/10da2fd3-a456-45e5-b211-452502c616f7.png" alt="Glav Logo" className="h-10" />
              
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-muted-foreground mb-2">
                O CRM feito para negócios digitais que querem vender mais
              </p>
              <p className="text-sm text-muted-foreground">
                🔗 <span className="text-primary font-medium">www.glav.com.br</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default LandingPage;