import { Card, CardContent } from '@/components/ui/card';
import { Users, RefreshCw, Percent, Target } from 'lucide-react';

interface DistributionStats {
  totalToday: number;
  byMode: Record<string, number>;
  byUser: Record<string, number>;
}

interface LeadDistributionStatsProps {
  stats: DistributionStats | null | undefined;
}

const modeLabels: Record<string, string> = {
  round_robin: 'Round Robin',
  percentage: 'Porcentagem',
  least_loaded: 'Menor Carga',
  fixed: 'Fixo',
  weighted_random: 'Peso Aleatório',
};

export default function LeadDistributionStats({ stats }: LeadDistributionStatsProps) {
  const roundRobinCount = stats?.byMode?.round_robin || 0;
  const percentageCount = stats?.byMode?.percentage || 0;
  const leastLoadedCount = stats?.byMode?.least_loaded || 0;
  const uniqueUsers = Object.keys(stats?.byUser || {}).length;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Distribuídos Hoje</p>
              <p className="text-2xl font-bold">{stats?.totalToday || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Round Robin</p>
              <p className="text-2xl font-bold">{roundRobinCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Percent className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Por Porcentagem</p>
              <p className="text-2xl font-bold">{percentageCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membros Ativos</p>
              <p className="text-2xl font-bold">{uniqueUsers}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
