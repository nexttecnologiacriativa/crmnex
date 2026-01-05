import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageCircle, UserX, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLeadResponseMetrics, formatResponseTime } from '@/hooks/useLeadResponseMetrics';
import { cn } from '@/lib/utils';

interface TVResponseTimeCardProps {
  isDarkMode?: boolean;
}

export default function TVResponseTimeCard({ isDarkMode }: TVResponseTimeCardProps) {
  const { data: metrics, isLoading } = useLeadResponseMetrics(1);

  const getStatusColor = (minutes: number | null, type: 'response' | 'whatsapp') => {
    if (minutes === null) return 'text-muted-foreground';
    if (type === 'response') {
      if (minutes <= 15) return 'text-green-500';
      if (minutes <= 60) return 'text-yellow-500';
      return 'text-red-500';
    }
    if (minutes <= 5) return 'text-green-500';
    if (minutes <= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAlertLevel = (count: number) => {
    if (count === 0) return 'text-green-500';
    if (count <= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const metricsData = [
    {
      icon: Clock,
      label: 'Tempo Médio 1º Atendimento',
      value: formatResponseTime(metrics?.avgFirstResponseTime ?? null),
      colorClass: getStatusColor(metrics?.avgFirstResponseTime ?? null, 'response'),
    },
    {
      icon: MessageCircle,
      label: 'Tempo Médio WhatsApp',
      value: formatResponseTime(metrics?.avgWhatsAppResponseTime ?? null),
      colorClass: getStatusColor(metrics?.avgWhatsAppResponseTime ?? null, 'whatsapp'),
    },
    {
      icon: AlertTriangle,
      label: 'Aguardando Resposta',
      value: metrics?.leadsWithoutResponse?.toString() ?? '0',
      colorClass: getAlertLevel(metrics?.leadsWithoutResponse ?? 0),
    },
    {
      icon: UserX,
      label: 'Nunca Contatados',
      value: metrics?.leadsNeverContacted?.toString() ?? '0',
      colorClass: getAlertLevel(metrics?.leadsNeverContacted ?? 0),
    },
  ];

  if (isLoading) {
    return (
      <Card className={cn(
        "h-full",
        isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/80"
      )}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "h-full",
      isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/80"
    )}>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className={cn(
          "text-base sm:text-lg flex items-center gap-2",
          isDarkMode ? "text-white" : ""
        )}>
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Tempo de Atendimento
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Tempo real
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {metricsData.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-2 sm:p-3 rounded-lg",
                isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <metric.icon className={cn("h-3 w-3 sm:h-4 sm:w-4", metric.colorClass)} />
                <span className={cn(
                  "text-[10px] sm:text-xs truncate",
                  isDarkMode ? "text-gray-300" : "text-muted-foreground"
                )}>
                  {metric.label}
                </span>
              </div>
              <motion.div
                key={metric.value}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={cn(
                  "text-lg sm:text-xl lg:text-2xl font-bold",
                  metric.colorClass
                )}
              >
                {metric.value}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
