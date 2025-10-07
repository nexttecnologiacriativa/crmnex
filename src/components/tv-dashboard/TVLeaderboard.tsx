import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

export default function TVLeaderboard() {
  const { currentWorkspace } = useWorkspace();

  const { data: leads = [] } = useQuery({
    queryKey: ['tv-leaderboard', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select(`
          value,
          status,
          assigned_to,
          profiles(full_name, email)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .not('assigned_to', 'is', null);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });

  const leaderboard = useMemo(() => {
    const userMap = new Map();
    
    leads.forEach(lead => {
      if (lead.assigned_to && lead.profiles) {
        if (!userMap.has(lead.assigned_to)) {
          userMap.set(lead.assigned_to, {
            id: lead.assigned_to,
            name: lead.profiles.full_name || lead.profiles.email,
            totalValue: 0,
            closedDeals: 0,
            totalLeads: 0,
          });
        }
        const user = userMap.get(lead.assigned_to);
        user.totalLeads++;
        user.totalValue += Number(lead.value || 0);
        if (lead.status === 'closed_won') {
          user.closedDeals++;
        }
      }
    });

    return Array.from(userMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }, [leads]);

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (position === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 2) return <Award className="h-5 w-5 text-orange-600" />;
    return <span className="text-muted-foreground font-bold">{position + 1}º</span>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏆 Top 5 Vendedores do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 flex items-center justify-center">
                {getMedalIcon(index)}
              </div>
              
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {user.closedDeals} vendas • {user.totalLeads} leads
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  R$ {user.totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.closedDeals > 0 ? `R$ ${(user.totalValue / user.closedDeals).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / venda` : 'Sem vendas'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
