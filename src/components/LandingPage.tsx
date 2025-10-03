import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Kanban, BarChart3, Webhook, Users, Smartphone, Menu, X, Star, TrendingUp, Zap, Target } from "lucide-react";
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
      description: "Clareza total de quem precisa de atenção agora",
      color: "green"
    },
    {
      icon: BarChart3,
      title: "Dashboard com funil",
      description: "Relatório visual já na tela inicial",
      color: "blue"
    },
    {
      icon: Webhook,
      title: "Integrações por Webhook",
      description: "Conecta com Elementor, Meta Ads e outras ferramentas que importam",
      color: "green"
    },
    {
      icon: Users,
      title: "Multiusuário",
      description: "Sua equipe inteira trabalhando junta, sem sobreposição nem bagunça",
      color: "blue"
    },
    {
      icon: Smartphone,
      title: "Responsivo e moderno",
      description: "Use no computador ou no celular com a mesma facilidade",
      color: "green"
    }
  ];

  const benefits = [
    "Organize todos os seus leads em um só lugar",
    "Acompanhe cada etapa do funil de vendas",
    "Integre com suas ferramentas favoritas",
    "Trabalhe em equipe de forma sincronizada",
    "Acesse de qualquer lugar, a qualquer hora"
  ];

  const steps = [
    {
      icon: Target,
      title: "Capture Leads",
      description: "Receba leads automaticamente de formulários, Meta Ads e webhooks"
    },
    {
      icon: Kanban,
      title: "Organize no Kanban",
      description: "Visualize e mova seus leads pelo funil de vendas"
    },
    {
      icon: TrendingUp,
      title: "Acompanhe Métricas",
      description: "Dashboard com insights em tempo real sobre seu desempenho"
    },
    {
      icon: Zap,
      title: "Converta Mais",
      description: "Nunca perca uma oportunidade com notificações e follow-ups"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src="/nexcrm-logo.png" alt="NexCRM Logo" className="h-12" />
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <Button 
                onClick={handleLoginClick} 
                variant="outline"
                className="border-2 border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white rounded-xl px-6 py-5 font-semibold transition-all"
              >
                Login
              </Button>
              <Button 
                onClick={handleCTAClick} 
                className="bg-[#A4D65E] hover:bg-[#8FC14E] text-white rounded-xl px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Cadastrar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-6 border-t border-gray-100">
              <div className="flex flex-col gap-4">
                <Button onClick={handleLoginClick} variant="outline" className="w-full justify-center rounded-xl border-2 border-[#003366] text-[#003366]">
                  Login
                </Button>
                <Button onClick={handleCTAClick} className="w-full bg-[#A4D65E] hover:bg-[#8FC14E] text-white rounded-xl">
                  Cadastrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-4 bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Text */}
            <div className="text-center lg:text-left">
              <Badge className="bg-[#A4D65E]/20 text-[#003366] hover:bg-[#A4D65E]/30 mb-6 text-sm px-4 py-2 font-medium">
                ✨ SaaS & CRM Moderno
              </Badge>
              
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-8 leading-tight">
                NexCRM – O CRM que{" "}
                <span className="text-[#003366] dark:text-[#A4D65E]">
                  transforma bagunça em vendas
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
                Organize hoje. Venda mais amanhã.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                <Button 
                  size="lg" 
                  onClick={handleCTAClick}
                  className="bg-[#A4D65E] hover:bg-[#8FC14E] text-white px-10 py-7 text-lg font-semibold shadow-lg hover:shadow-xl rounded-xl transition-all"
                >
                  Começar Agora
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleLoginClick}
                  variant="outline"
                  className="border-2 border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white px-10 py-7 text-lg font-semibold rounded-xl transition-all"
                >
                  Ver Demo
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003366] to-[#A4D65E] border-2 border-white dark:border-slate-950 flex items-center justify-center text-white font-bold text-sm">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-[#A4D65E] text-[#A4D65E]" />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">4.9/5 de avaliação</span>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative">
              <div className="relative">
                {/* Blur Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/10 via-[#A4D65E]/10 to-[#E3F2FD]/20 blur-3xl rounded-3xl"></div>
                
                {/* Mockup Area */}
                <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800">
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-[#003366] rounded-2xl mx-auto flex items-center justify-center">
                        <Kanban className="w-12 h-12 text-[#A4D65E]" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto"></div>
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32 mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="relative py-24 px-4 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Visual */}
            <div className="relative order-2 lg:order-1">
              <div className="relative">
                {/* Blur Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#A4D65E]/10 via-[#003366]/10 to-[#E3F2FD]/20 blur-3xl rounded-3xl"></div>
                
                {/* Mockup Area */}
                <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800">
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-[#A4D65E] rounded-2xl mx-auto flex items-center justify-center">
                        <BarChart3 className="w-12 h-12 text-white" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto"></div>
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32 mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Text */}
            <div className="order-1 lg:order-2">
              <Badge className="bg-[#003366]/10 text-[#003366] hover:bg-[#003366]/20 mb-6 text-sm px-4 py-2 font-medium">
                Sobre o NexCRM
              </Badge>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-8 leading-tight">
                O problema é <span className="text-[#A4D65E]">simples</span>
              </h2>
              
              <div className="space-y-6 mb-10">
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Não é falta de esforço. Não é porque você não quer vender.
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  É porque sem organização, os leads simplesmente escorrem pelos dedos.
                </p>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#A4D65E] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4 bg-gray-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="bg-[#A4D65E]/20 text-[#003366] hover:bg-[#A4D65E]/30 mb-6 text-sm px-4 py-2 font-medium">
              Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              O que você ganha com o NexCRM
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Tudo que você precisa para organizar, acompanhar e converter seus leads
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-800 h-full">
                  <div className={`w-14 h-14 ${feature.color === 'green' ? 'bg-[#A4D65E]' : 'bg-[#003366]'} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative py-24 px-4 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="bg-[#003366]/10 text-[#003366] hover:bg-[#003366]/20 mb-6 text-sm px-4 py-2 font-medium">
              Como Funciona
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Seu caminho para o crescimento sem esforço
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-slate-800 h-full">
                  <div className="w-14 h-14 bg-[#003366] rounded-xl flex items-center justify-center mb-6">
                    <step.icon className="h-7 w-7 text-[#A4D65E]" />
                  </div>
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#A4D65E] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 px-4 bg-[#003366] dark:bg-[#002244]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Está pronto para{" "}
              <span className="text-[#A4D65E]">mudar o jogo?</span>
            </h2>
            <div className="space-y-6 text-lg text-white/90 leading-relaxed mb-10 max-w-3xl mx-auto">
              <p>O NexCRM não é só um sistema.</p>
              <p className="text-xl font-semibold text-white">
                É a diferença entre trabalhar no escuro ou enxergar claramente cada etapa do seu funil.
              </p>
              <p className="text-xl font-semibold text-white">
                É a diferença entre perder oportunidades todos os dias ou transformar cada lead em cliente.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
              <Button 
                size="lg" 
                onClick={handleCTAClick}
                className="bg-[#A4D65E] hover:bg-[#8FC14E] text-white px-12 py-8 text-xl font-bold shadow-2xl rounded-xl transition-all"
              >
                Quero começar com o NexCRM
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </div>

            <p className="text-2xl font-bold text-[#A4D65E]">
              👉 Organize hoje. Venda mais amanhã.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-4 bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <img src="/nexcrm-logo.png" alt="NexCRM Logo" className="h-12" />
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
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