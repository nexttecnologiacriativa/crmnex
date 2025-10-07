import { useState, useEffect } from 'react';
import { Maximize, Minimize, Settings, Moon, Sun, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TVMetricCard from '@/components/tv-dashboard/TVMetricCard';
import TVActivityFeed from '@/components/tv-dashboard/TVActivityFeed';
import TVFunnelChart from '@/components/tv-dashboard/TVFunnelChart';
import TVLeaderboard from '@/components/tv-dashboard/TVLeaderboard';
import TVPerformanceChart from '@/components/tv-dashboard/TVPerformanceChart';
import TVTopTags from '@/components/tv-dashboard/TVTopTags';
import TVSettings from '@/components/tv-dashboard/TVSettings';
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
        : "bg-gradient-to-br from-[hsl(209,60%,85%)] via-[hsl(209,50%,90%)] to-[hsl(87,40%,90%)]"
    )}>
      {/* Animated background */}
      <div className="fixed inset-0 opacity-20">
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
          "flex items-center justify-between mb-3 p-3 rounded-lg",
          isDarkMode ? "bg-transparent" : "bg-white/60 backdrop-blur-sm shadow-sm"
        )}>
          <div className="flex items-center gap-3">
            <img src="/nexcrm-logo.png" alt="Logo" className="h-10" />
            <h1 className={cn(
              "text-2xl font-bold",
              isDarkMode ? "text-white" : "text-[hsl(209,100%,22%)]"
            )}>Dashboard TV</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={openCRM}
              className={cn(
                "gap-2",
                isDarkMode 
                  ? "glass-morphism border-white/20 text-white hover:bg-white/20"
                  : "bg-white/80 border-[hsl(209,100%,22%)]/20 text-[hsl(209,100%,22%)] hover:bg-white"
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
                isDarkMode 
                  ? "glass-morphism border-white/20 text-white hover:bg-white/20"
                  : "bg-white/80 border-[hsl(209,100%,22%)]/20 text-[hsl(209,100%,22%)] hover:bg-white"
              )}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                isDarkMode 
                  ? "glass-morphism border-white/20 text-white hover:bg-white/20"
                  : "bg-white/80 border-[hsl(209,100%,22%)]/20 text-[hsl(209,100%,22%)] hover:bg-white"
              )}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className={cn(
                isDarkMode 
                  ? "glass-morphism border-white/20 text-white hover:bg-white/20"
                  : "bg-white/80 border-[hsl(209,100%,22%)]/20 text-[hsl(209,100%,22%)] hover:bg-white"
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

        {/* Hero Metrics */}
        <div className="grid grid-cols-5 gap-3 mb-3">
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

        {/* Main Dashboard Grid - Otimizado para uma tela */}
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          {/* Left Column - Funnel & Performance */}
          <div className="col-span-7 flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">
              <TVFunnelChart />
            </div>
            <div className="flex-1 min-h-0">
              <TVPerformanceChart />
            </div>
          </div>

          {/* Right Column - Leaderboard, Activities & Tags */}
          <div className="col-span-5 flex flex-col gap-3 min-h-0">
            <div className="flex-[1.2] min-h-0">
              <TVLeaderboard />
            </div>
            <div className="flex-1 min-h-0">
              <TVActivityFeed />
            </div>
            <div className="flex-[0.8] min-h-0">
              <TVTopTags />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
