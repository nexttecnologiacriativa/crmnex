import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Kanban, BarChart3, Webhook, Users, Smartphone, Menu, X } from "lucide-react";
import { useState } from "react";

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLoginClick = () => {
    window.location.href = '/auth';
  };

  const handleCTAClick = () => {
    const message = encodeURIComponent("Olá, quero saber mais sobre o NexCRM");
    window.open(`https://wa.me/5512991038427?text=${message}`, '_blank');
  };

  const features = [
    {
      icon: Kanban,
      title: "Kanban visual",
      description: "Clareza total de quem precisa de atenção agora"
    },
    {
      icon: BarChart3,
      title: "Dashboard com funil",
      description: "Relatório visual já na tela inicial"
    },
    {
      icon: Webhook,
      title: "Integrações por Webhook",
      description: "Conecta com Elementor, Meta Ads e outras ferramentas que importam"
    },
    {
      icon: Users,
      title: "Multiusuário",
      description: "Sua equipe inteira trabalhando junta, sem sobreposição nem bagunça"
    },
    {
      icon: Smartphone,
      title: "Responsivo e moderno",
      description: "Use no computador ou no celular com a mesma facilidade"
    }
  ];

  const targetAudience = [
    "Empreendedores que cansaram de perder vendas",
    "Equipes comerciais que precisam de organização",
    "Negócios que querem saber exatamente de onde vem cada cliente"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-b border-white/20 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/nexcrm-logo.png" alt="NexCRM Logo" className="h-10" />
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <Button onClick={handleLoginClick} variant="ghost" className="text-foreground/80 hover:text-foreground">
                Login
              </Button>
              <Button onClick={handleCTAClick} className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg">
                Quero começar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/20">
              <div className="flex flex-col gap-4">
                <Button onClick={handleLoginClick} variant="ghost" className="w-full justify-start">
                  Login
                </Button>
                <Button onClick={handleCTAClick} className="w-full bg-gradient-to-r from-primary to-blue-600 text-white">
                  Quero começar
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              NexCRM – O CRM que transforma{" "}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                bagunça em vendas
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Organize hoje. Venda mais amanhã.
            </p>
          </div>

          {/* Problem Card */}
          <Card className="backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border border-white/20 shadow-2xl mb-8">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                O problema é simples
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>Não é falta de esforço.</p>
                <p>Não é porque você não quer vender.</p>
                <p className="font-semibold text-foreground">É porque sem organização, os leads simplesmente escorrem pelos dedos.</p>
                <div className="mt-6 space-y-3 pl-4 border-l-4 border-primary/50">
                  <p>Você fala com o cliente hoje e amanhã já esqueceu de dar retorno.</p>
                  <p>Abre a planilha e não sabe mais quem está em qual etapa.</p>
                  <p>No fim, acaba trabalhando o dobro e faturando a metade.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solution Card */}
          <Card className="backdrop-blur-xl bg-gradient-to-br from-primary/10 to-blue-600/10 border border-white/30 shadow-2xl mb-16">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                A solução é clara
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Chegou o <span className="font-bold text-primary">NexCRM</span>, um sistema feito para simplificar e acelerar seus resultados.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                Aqui não tem frescura nem funções que você nunca vai usar.
              </p>
              <p className="text-xl font-semibold text-foreground mt-4">
                É direto, visual e poderoso.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              O que você ganha com o NexCRM
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/60 to-blue-50/60 dark:from-slate-900/60 dark:to-blue-950/60 border border-white/30 shadow-2xl">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Por que escolher o NexCRM
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>O mercado está cheio de CRMs complicados, caros e cheios de funções que só servem para te travar.</p>
                <p className="font-semibold text-foreground">
                  O NexCRM nasceu para resolver o que realmente atrapalha seu crescimento: falta de organização, falta de clareza e falta de acompanhamento de cada lead.
                </p>
                <p className="text-xl font-bold text-primary mt-6">
                  Você não precisa de mais um sistema bonito.
                </p>
                <p className="text-xl font-bold text-primary">
                  Você precisa de resultados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Para quem é o NexCRM
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {targetAudience.map((audience, index) => (
              <Card key={index} className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 border border-white/20 shadow-xl">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-foreground">{audience}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <Card className="backdrop-blur-xl bg-red-50/50 dark:bg-red-950/30 border border-red-200/50 shadow-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                O que acontece se você não agir
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Cada dia que passa, você deixa clientes escaparem porque não tem controle.
              </p>
              <p className="text-xl font-semibold text-foreground">
                São oportunidades indo embora enquanto você se perde em planilhas e lembretes no WhatsApp.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="backdrop-blur-xl bg-gradient-to-br from-primary/20 to-blue-600/20 border border-white/30 shadow-2xl">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Está pronto para mudar o jogo?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                O NexCRM não é só um sistema.
              </p>
              <p className="text-xl font-semibold text-foreground mb-4">
                É a diferença entre trabalhar no escuro ou enxergar claramente cada etapa do seu funil.
              </p>
              <p className="text-xl font-semibold text-foreground mb-8">
                É a diferença entre perder oportunidades todos os dias ou transformar cada lead em cliente.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button 
                  size="lg" 
                  onClick={handleCTAClick}
                  className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white px-12 py-6 text-lg shadow-2xl"
                >
                  Quero começar com o NexCRM
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <p className="text-2xl font-bold text-primary">
                👉 Organize hoje. Venda mais amanhã.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-t border-white/20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img src="/nexcrm-logo.png" alt="NexCRM Logo" className="h-10" />
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-muted-foreground">
                O CRM que transforma bagunça em vendas
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;