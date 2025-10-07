import { useState, useEffect } from 'react';
import { Maximize, Minimize, Settings, Moon, Sun, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TVMetricCard from '@/components/tv-dashboard/TVMetricCard';
import TVActivityFeed from '@/components/tv-dashboard/TVActivityFeed';
import TVFunnelChart from '@/components/tv-dashboard/TVFunnelChart';
import TVLeaderboard from '@/components/tv-dashboard/TVLeaderboard';
import TVPerformanceChart from '@/components/tv-dashboard/TVPerformanceChart';
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
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src="/nexcrm-logo.png" alt="Logo" className="h-10" />
          <h1 className="text-3xl font-bold text-primary">Dashboard TV - Tempo Real</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openCRM}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Abrir CRM</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-6">
          <TVSettings onClose={() => setShowSettings(false)} />
        </div>
      )}

      {/* Hero Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
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

      {/* Top Section - Leaderboard */}
      <div className="mb-6">
        <TVLeaderboard />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2">
          <TVFunnelChart />
        </div>
        <div>
          <TVActivityFeed />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mb-6">
        <TVPerformanceChart />
      </div>
    </div>
  );
}
