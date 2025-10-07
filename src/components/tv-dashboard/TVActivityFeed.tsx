import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function TVActivityFeed() {
  const isDarkMode = true; // Você pode passar isso como prop
  const [visibleCount, setVisibleCount] = useState(0);

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

  // Animação contínua: mostra cards um por um em loop
  useEffect(() => {
    if (activities.length === 0) return;

    setVisibleCount(0);
    
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        // Quando chegar ao final, reinicia
        if (prev >= activities.length) {
          return 1;
        }
        return prev + 1;
      });
    }, 500); // Cada card aparece a cada 500ms

    return () => clearInterval(interval);
  }, [activities.length]);

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
      'lead_created': 'bg-[hsl(87,57%,51%)]',
      'stage_change': 'bg-[hsl(209,100%,22%)]',
      'task_completed': 'bg-[hsl(87,57%,40%)]',
      'whatsapp_message': 'bg-[hsl(87,50%,35%)]',
      'sale_closed': 'bg-[hsl(209,90%,35%)]',
    };
    return colors[type] || 'bg-[hsl(209,80%,30%)]';
  };

  return (
    <Card className={cn(
      "h-full glass-morphism border-2 border-white/20 overflow-hidden",
      isDarkMode 
        ? "bg-gradient-to-br from-[hsl(209,100%,22%)]/80 to-[hsl(209,80%,15%)]/80"
        : "bg-white/90 backdrop-blur-sm"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          "flex items-center gap-2 text-lg",
          isDarkMode ? "text-white" : "text-[hsl(209,100%,22%)]"
        )}>
          <motion.span
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              repeatDelay: 2
            }}
          >
            ⚡
          </motion.span>
          Atividades em Tempo Real
          <motion.span
            className="inline-block w-2 h-2 bg-[hsl(87,57%,51%)] rounded-full ml-2"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100%-80px)] pr-2">
          <div className="space-y-2">
            {activities.slice(0, visibleCount).map((activity, index) => (
              <motion.div
                key={`${activity.id}-${index}`}
                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
                className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer border border-white/20"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <motion.div 
                      className={`w-8 h-8 rounded-full ${getActivityColor(activity.activity_type)} flex items-center justify-center text-white`}
                      animate={{ 
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 0px rgba(0,0,0,0)',
                          '0 0 10px rgba(255,255,255,0.5)',
                          '0 0 0px rgba(0,0,0,0)'
                        ]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    >
                      {getActivityIcon(activity.activity_type)}
                    </motion.div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-sm",
                      isDarkMode ? "text-white" : "text-[hsl(209,100%,22%)]"
                    )}>{activity.title}</p>
                    {activity.leads && (
                      <p className={cn(
                        "text-xs font-medium truncate",
                        isDarkMode ? "text-[hsl(87,57%,51%)]" : "text-[hsl(87,57%,40%)]"
                      )}>
                        Lead: {activity.leads.name}
                      </p>
                    )}
                    {activity.description && (
                      <p className={cn(
                        "text-xs mt-1 line-clamp-1",
                        isDarkMode ? "text-white/70" : "text-[hsl(209,100%,22%)]/70"
                      )}>
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
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
