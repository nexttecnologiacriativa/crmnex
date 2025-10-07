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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-3 sm:p-4 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-700" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img src="/nexcrm-logo.png" alt="Logo" className="h-10" />
            <h1 className="text-2xl font-bold text-white">Dashboard TV</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={openCRM}
              className="gap-2 glass-morphism border-white/20 text-white hover:bg-white/20"
              size="sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span>CRM</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="glass-morphism border-white/20 text-white hover:bg-white/20"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="glass-morphism border-white/20 text-white hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="glass-morphism border-white/20 text-white hover:bg-white/20"
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
          />
          <TVMetricCard
            title="Receita Mês"
            value={metrics.monthlyRevenue}
            goal={metrics.revenueGoal}
            icon="💰"
            variant="success"
            prefix="R$"
          />
          <TVMetricCard
            title="Conversão"
            value={metrics.conversionRate}
            change={metrics.conversionChange}
            icon="📈"
            variant="info"
            suffix="%"
          />
          <TVMetricCard
            title="Total Leads"
            value={metrics.totalLeads}
            icon="👥"
            variant="warning"
          />
          <TVMetricCard
            title="Pipeline"
            value={metrics.pipelineValue}
            icon="💵"
            variant="secondary"
            prefix="R$"
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
