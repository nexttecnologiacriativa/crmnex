import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TVActivityFeedProps {
  isDarkMode?: boolean;
}

export default function TVActivityFeed({ isDarkMode = true }: TVActivityFeedProps) {
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
      'lead_created': 'bg-green-500',
      'stage_change': 'bg-blue-500',
      'task_completed': 'bg-emerald-500',
      'whatsapp_message': 'bg-green-600',
      'sale_closed': 'bg-amber-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <Card className={cn(
      "h-full border-0 shadow-xl rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-2xl",
      isDarkMode ? "bg-gray-800/90" : "bg-white"
    )}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />

      <CardHeader className={cn(
        "pb-3 border-b relative",
        isDarkMode 
          ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-gray-700/50"
          : "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-gray-100"
      )}>
        <CardTitle className={cn(
          "flex items-center gap-2 text-lg",
          isDarkMode ? "text-white" : "text-gray-800"
        )}>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isDarkMode ? "bg-amber-500/20" : "bg-amber-500/10"
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
              <Activity className="h-4 w-4 text-amber-500" />
            </motion.span>
          </div>
          Atividades em Tempo Real
          <motion.span
            className="inline-block w-2 h-2 bg-green-500 rounded-full ml-2"
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
      <CardContent className="pt-3 relative">
        <ScrollArea className="h-[calc(100%-20px)] pr-2">
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
                className={cn(
                  "p-3 rounded-xl transition-all cursor-pointer border shadow-sm",
                  isDarkMode 
                    ? "bg-gray-700/50 hover:bg-gray-700/70 border-gray-600/30" 
                    : "bg-gray-50 hover:bg-gray-100 border-gray-100"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <motion.div 
                      className={`w-8 h-8 rounded-lg ${getActivityColor(activity.activity_type)} flex items-center justify-center text-white shadow-md`}
                      animate={{ 
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 0px rgba(0,0,0,0)',
                          '0 0 10px rgba(255,255,255,0.3)',
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
                      isDarkMode ? "text-white" : "text-gray-800"
                    )}>{activity.title}</p>
                    {activity.leads && (
                      <p className={cn(
                        "text-xs font-medium truncate",
                        isDarkMode ? "text-amber-400" : "text-amber-600"
                      )}>
                        Lead: {activity.leads.name}
                      </p>
                    )}
                    {activity.description && (
                      <p className={cn(
                        "text-xs mt-1 line-clamp-1",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {activity.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          isDarkMode ? "border-gray-600 text-gray-300" : "border-gray-200"
                        )}
                      >
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