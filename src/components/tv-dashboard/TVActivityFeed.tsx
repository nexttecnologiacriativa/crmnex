import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export default function TVActivityFeed() {
  const { data: activities = [] } = useQuery({
    queryKey: ['tv-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select(`
          *,
          leads(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      'lead_created': '✅',
      'stage_change': '🎯',
      'task_created': '📝',
      'task_completed': '✔️',
      'tag_added': '🏷️',
      'data_update': '📝',
      'whatsapp_message': '💬',
      'sale_closed': '💰',
    };
    return icons[type] || '📌';
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      'lead_created': 'bg-green-500',
      'stage_change': 'bg-blue-500',
      'task_completed': 'bg-green-600',
      'whatsapp_message': 'bg-yellow-500',
      'sale_closed': 'bg-purple-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="animate-pulse">⚡</span>
          Atividades em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <AnimatePresence>
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="mb-4 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full ${getActivityColor(activity.activity_type)} flex items-center justify-center text-white`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.title}</p>
                    {activity.leads && (
                      <p className="text-xs text-muted-foreground truncate">
                        Lead: {activity.leads.name}
                      </p>
                    )}
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
