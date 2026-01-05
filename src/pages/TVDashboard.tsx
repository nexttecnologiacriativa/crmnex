import { useState, useEffect } from 'react';
import { Maximize, Minimize, Settings, Moon, Sun, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TVMetricCard from '@/components/tv-dashboard/TVMetricCard';
import TVActivityFeed from '@/components/tv-dashboard/TVActivityFeed';
import TVFunnelChart from '@/components/tv-dashboard/TVFunnelChart';

import TVSettings from '@/components/tv-dashboard/TVSettings';
import TVAppointmentsCard from '@/components/tv-dashboard/TVAppointmentsCard';
import TVResponseTimeCard from '@/components/tv-dashboard/TVResponseTimeCard';
import { useTVDashboardMetrics } from '@/hooks/useTVDashboardMetrics';
import { useTVDashboardRealtime } from '@/hooks/useTVDashboardRealtime';
import { cn } from '@/lib/utils';

export default function TVDashboard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { metrics, isLoading } = useTVDashboardMetrics();
  
  useTVDashboardRealtime();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const openCRM = () => {
    window.open('/dashboard', '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen p-3 sm:p-4 overflow-hidden",
      isDarkMode 
        ? "bg-gradient-to-br from-[hsl(209,100%,22%)] via-[hsl(209,80%,15%)] to-[hsl(209,100%,10%)]"
        : "bg-white"
    )}>
      {/* Animated background */}
      <div className={cn(
        "fixed inset-0",
        isDarkMode ? "opacity-20" : "opacity-10"
      )}>
        <div className={cn(
          "absolute top-0 left-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse",
          isDarkMode ? "bg-[hsl(209,100%,22%)]" : "bg-[hsl(209,70%,70%)]"
        )} />
        <div className={cn(
          "absolute top-0 right-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-700",
          isDarkMode ? "bg-[hsl(87,57%,51%)]" : "bg-[hsl(87,50%,75%)]"
        )} />
        <div className={cn(
          "absolute bottom-0 left-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000",
          isDarkMode ? "bg-[hsl(209,80%,30%)]" : "bg-[hsl(209,60%,75%)]"
        )} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between mb-3 p-4 rounded-2xl border-0 shadow-xl relative overflow-hidden transition-all duration-300",
          isDarkMode 
            ? "bg-gray-800/90" 
            : "bg-white"
        )}>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
          
          <div className="flex items-center gap-3 relative">
            <div className={cn(
              "p-2 rounded-xl",
              isDarkMode ? "bg-white/10" : "bg-primary/5"
            )}>
              <img src="/nexcrm-logo.png" alt="Logo" className="h-8" />
            </div>
            <h1 className={cn(
              "text-2xl font-bold",
              isDarkMode ? "text-white" : "text-gray-800"
            )}>Dashboard TV</h1>
          </div>
          <div className="flex items-center gap-2 relative">
            <Button
              variant="outline"
              onClick={openCRM}
              className={cn(
                "gap-2 border-0 shadow-md transition-all hover:scale-105",
                isDarkMode 
                  ? "bg-gray-700/80 text-white hover:bg-gray-600" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
              size="sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span>CRM</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "border-0 shadow-md transition-all hover:scale-105",
                isDarkMode 
                  ? "bg-gray-700/80 text-white hover:bg-gray-600" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "border-0 shadow-md transition-all hover:scale-105",
                isDarkMode 
                  ? "bg-gray-700/80 text-white hover:bg-gray-600" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className={cn(
                "border-0 shadow-md transition-all hover:scale-105",
                isDarkMode 
                  ? "bg-gray-700/80 text-white hover:bg-gray-600" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-3">
            <TVSettings onClose={() => setShowSettings(false)} />
          </div>
        )}

        {/* Hero Metrics - Compact */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 mb-2">
          <TVMetricCard
            title="Leads Hoje"
            value={metrics.leadsToday}
            change={metrics.leadsChange}
            icon="🎯"
            variant="primary"
            isDarkMode={isDarkMode}
          />
          <TVMetricCard
            title="Receita Mês"
            value={metrics.monthlyRevenue}
            goal={metrics.revenueGoal}
            icon="💰"
            variant="success"
            prefix="R$"
            isDarkMode={isDarkMode}
          />
          <TVMetricCard
            title="Conversão"
            value={metrics.conversionRate}
            change={metrics.conversionChange}
            icon="📈"
            variant="info"
            suffix="%"
            isDarkMode={isDarkMode}
          />
          <TVMetricCard
            title="Total Leads"
            value={metrics.totalLeads}
            icon="👥"
            variant="warning"
            isDarkMode={isDarkMode}
          />
          <TVMetricCard
            title="Pipeline"
            value={metrics.pipelineValue}
            icon="💵"
            variant="secondary"
            prefix="R$"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 min-h-0 overflow-auto">
          {/* Row 1: Agendamentos + Atividades lado a lado */}
          <div className="min-h-[160px] lg:min-h-0">
            <TVAppointmentsCard isDarkMode={isDarkMode} />
          </div>
          <div className="min-h-[160px] lg:min-h-0">
            <TVActivityFeed isDarkMode={isDarkMode} />
          </div>

          {/* Row 2: Funil + Tempo de Atendimento */}
          <div className="min-h-[200px] lg:min-h-0">
            <TVFunnelChart isDarkMode={isDarkMode} />
          </div>
          <div className="min-h-[200px] lg:min-h-0">
            <TVResponseTimeCard isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
