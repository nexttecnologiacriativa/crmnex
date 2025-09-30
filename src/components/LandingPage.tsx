import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Kanban, BarChart3, Webhook, Users, Smartphone, Menu, X, TrendingUp, Zap, Target } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-950 dark:via-blue-950 dark:to-cyan-950 overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-2xl bg-white/30 dark:bg-slate-900/30 border-b border-white/20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src="/nexcrm-logo.png" alt="NexCRM Logo" className="h-12" />
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <Button 
                onClick={handleLoginClick} 
                variant="ghost" 
                className="text-foreground/80 hover:text-foreground hover:bg-white/40 rounded-full px-6"
              >
                Login
              </Button>
              <Button 
                onClick={handleCTAClick} 
                className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white shadow-2xl shadow-blue-500/50 rounded-full px-8 py-6 text-base font-semibold"
              >
                Quero começar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-6 border-t border-white/20">
              <div className="flex flex-col gap-4">
                <Button onClick={handleLoginClick} variant="ghost" className="w-full justify-start rounded-full">
                  Login
                </Button>
                <Button onClick={handleCTAClick} className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-full">
                  Quero começar
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-8 leading-tight">
              NexCRM – O CRM que{" "}
              <span className="block mt-2">
                transforma{" "}
                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  bagunça em vendas
                </span>
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              Organize hoje. Venda mais amanhã.
            </p>
          </div>

          {/* Problem Card */}
          <div className="max-w-5xl mx-auto mb-12">
            <div className="backdrop-blur-2xl bg-gradient-to-br from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-800/40 rounded-[3rem] border border-white/30 shadow-2xl p-10 md:p-16">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
                O problema é <span className="text-purple-600">simples</span>
              </h2>
              <div className="space-y-6 text-xl text-muted-foreground leading-relaxed">
                <p>Não é falta de esforço.</p>
                <p>Não é porque você não quer vender.</p>
                <p className="text-2xl font-bold text-foreground bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  É porque sem organização, os leads simplesmente escorrem pelos dedos.
                </p>
                <div className="mt-8 space-y-4 pl-6 border-l-4 border-purple-500 rounded-l-2xl">
                  <p>Você fala com o cliente hoje e amanhã já esqueceu de dar retorno.</p>
                  <p>Abre a planilha e não sabe mais quem está em qual etapa.</p>
                  <p>No fim, acaba trabalhando o dobro e faturando a metade.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Solution Card */}
          <div className="max-w-5xl mx-auto mb-20">
            <div className="backdrop-blur-2xl bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 rounded-[3rem] border border-white/40 shadow-2xl p-10 md:p-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full filter blur-3xl opacity-20"></div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8 relative z-10">
                A solução é <span className="text-blue-600">clara</span>
              </h2>
              <div className="space-y-6 text-xl text-foreground/80 leading-relaxed relative z-10">
                <p>
                  Chegou o <span className="font-bold text-purple-600 text-2xl">NexCRM</span>, um sistema feito para simplificar e acelerar seus resultados.
                </p>
                <p className="text-lg">
                  Aqui não tem frescura nem funções que você nunca vai usar.
                </p>
                <p className="text-2xl font-bold text-foreground">
                  É direto, visual e poderoso.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              O que você ganha com o{" "}
              <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                NexCRM
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group">
                <div className="backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 rounded-[2rem] border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 p-8 h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    <h3 className="text-2xl font-bold text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-lg">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="relative py-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="backdrop-blur-2xl bg-gradient-to-br from-white/70 to-blue-50/70 dark:from-slate-900/70 dark:to-blue-950/70 rounded-[3rem] border border-white/40 shadow-2xl p-10 md:p-20">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-10">
              Por que escolher o{" "}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                NexCRM
              </span>
            </h2>
            <div className="space-y-6 text-xl text-muted-foreground leading-relaxed">
              <p>O mercado está cheio de CRMs complicados, caros e cheios de funções que só servem para te travar.</p>
              <p className="text-2xl font-semibold text-foreground">
                O NexCRM nasceu para resolver o que realmente atrapalha seu crescimento: falta de organização, falta de clareza e falta de acompanhamento de cada lead.
              </p>
              <div className="mt-10 space-y-4">
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Você não precisa de mais um sistema bonito.
                </p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Você precisa de resultados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="relative py-32 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-8">
              Para quem é o{" "}
              <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                NexCRM
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {targetAudience.map((audience, index) => (
              <div key={index} className="backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 rounded-[2rem] border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 p-10">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-xl font-bold text-foreground leading-relaxed">{audience}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="relative py-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="backdrop-blur-2xl bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-950/50 dark:to-orange-950/50 rounded-[3rem] border border-red-200/50 shadow-2xl p-10 md:p-20">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
                O que acontece se você{" "}
                <span className="text-red-600">não agir</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                Cada dia que passa, você deixa clientes escaparem porque não tem controle.
              </p>
              <p className="text-2xl font-bold text-foreground">
                São oportunidades indo embora enquanto você se perde em planilhas e lembretes no WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="backdrop-blur-2xl bg-gradient-to-br from-purple-500/30 via-blue-500/30 to-cyan-500/30 rounded-[3rem] border border-white/40 shadow-2xl p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-10 left-10 w-40 h-40 bg-purple-400 rounded-full filter blur-3xl opacity-30"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-400 rounded-full filter blur-3xl opacity-30"></div>
            </div>
            
            <div className="text-center relative z-10">
              <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-8">
                Está pronto para{" "}
                <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  mudar o jogo?
                </span>
              </h2>
              <div className="space-y-6 text-xl text-foreground/90 leading-relaxed mb-10">
                <p>O NexCRM não é só um sistema.</p>
                <p className="text-2xl font-semibold">
                  É a diferença entre trabalhar no escuro ou enxergar claramente cada etapa do seu funil.
                </p>
                <p className="text-2xl font-semibold">
                  É a diferença entre perder oportunidades todos os dias ou transformar cada lead em cliente.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
                <Button 
                  size="lg" 
                  onClick={handleCTAClick}
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white px-12 py-8 text-xl font-bold shadow-2xl shadow-blue-500/50 rounded-full"
                >
                  Quero começar com o NexCRM
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </div>

              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                👉 Organize hoje. Venda mais amanhã.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-4 backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 border-t border-white/20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <img src="/nexcrm-logo.png" alt="NexCRM Logo" className="h-12" />
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-lg text-muted-foreground font-medium">
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