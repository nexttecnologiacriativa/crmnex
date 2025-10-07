import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <Card className="h-full glass-morphism border-2 border-white/20 overflow-hidden bg-gradient-to-br from-[hsl(209,100%,22%)]/80 to-[hsl(209,80%,15%)]/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          🏆 Top 5 Vendedores do Mês
          <motion.span
            className="inline-block w-2 h-2 bg-yellow-500 rounded-full"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((user, index) => (
            <motion.div
              key={user.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all border border-white/20"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ scale: 1.02 }}
            >
              <motion.div 
                className="flex-shrink-0 w-10 flex items-center justify-center"
                animate={{ 
                  rotate: index === 0 ? [0, -10, 10, 0] : 0,
                  scale: index === 0 ? [1, 1.1, 1] : 1
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                {getMedalIcon(index)}
              </motion.div>
              
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-white">{user.name}</p>
                <motion.p 
                  className="text-sm text-white/70"
                  key={`deals-${user.closedDeals}-${user.totalLeads}`}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {user.closedDeals} vendas • {user.totalLeads} leads
                </motion.p>
              </div>

              <div className="text-right">
                <motion.p 
                  className="text-xl font-bold text-white drop-shadow-lg"
                  key={`value-${user.totalValue}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  R$ {user.totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </motion.p>
                <p className="text-xs text-white/60">
                  {user.closedDeals > 0 ? `R$ ${(user.totalValue / user.closedDeals).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / venda` : 'Sem vendas'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
