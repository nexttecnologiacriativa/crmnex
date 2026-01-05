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

  const getStatusBg = (minutes: number | null, type: 'response' | 'whatsapp') => {
    if (minutes === null) return isDarkMode ? 'from-gray-500/20 to-gray-500/5 border-gray-500/20' : 'from-gray-100 to-gray-50 border-gray-200';
    if (type === 'response') {
      if (minutes <= 15) return isDarkMode ? 'from-green-500/20 to-green-500/5 border-green-500/20' : 'from-green-500/10 to-green-50 border-green-100';
      if (minutes <= 60) return isDarkMode ? 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20' : 'from-yellow-500/10 to-yellow-50 border-yellow-100';
      return isDarkMode ? 'from-red-500/20 to-red-500/5 border-red-500/20' : 'from-red-500/10 to-red-50 border-red-100';
    }
    if (minutes <= 5) return isDarkMode ? 'from-green-500/20 to-green-500/5 border-green-500/20' : 'from-green-500/10 to-green-50 border-green-100';
    if (minutes <= 30) return isDarkMode ? 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20' : 'from-yellow-500/10 to-yellow-50 border-yellow-100';
    return isDarkMode ? 'from-red-500/20 to-red-500/5 border-red-500/20' : 'from-red-500/10 to-red-50 border-red-100';
  };

  const getAlertLevel = (count: number) => {
    if (count === 0) return 'text-green-500';
    if (count <= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAlertBg = (count: number) => {
    if (count === 0) return isDarkMode ? 'from-green-500/20 to-green-500/5 border-green-500/20' : 'from-green-500/10 to-green-50 border-green-100';
    if (count <= 5) return isDarkMode ? 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20' : 'from-yellow-500/10 to-yellow-50 border-yellow-100';
    return isDarkMode ? 'from-red-500/20 to-red-500/5 border-red-500/20' : 'from-red-500/10 to-red-50 border-red-100';
  };

  if (isLoading) {
    return (
      <Card className={cn(
        "h-full border-0 shadow-xl rounded-2xl overflow-hidden",
        isDarkMode ? "bg-gray-800/90" : "bg-white"
      )}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "h-full border-0 shadow-xl rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-2xl",
      isDarkMode ? "bg-gray-800/90" : "bg-white"
    )}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />

      <CardHeader className={cn(
        "pb-2 sm:pb-3 border-b relative",
        isDarkMode 
          ? "bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent border-gray-700/50"
          : "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-gray-100"
      )}>
        <CardTitle className={cn(
          "text-base sm:text-lg flex items-center gap-2",
          isDarkMode ? "text-white" : "text-gray-800"
        )}>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isDarkMode ? "bg-blue-500/20" : "bg-blue-500/10"
          )}>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
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
      <CardContent className="pt-3 relative">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Tempo Médio 1º Atendimento */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-2 sm:p-3 rounded-xl shadow-lg border bg-gradient-to-br transition-all hover:scale-[1.02]",
              getStatusBg(metrics?.avgFirstResponseTime ?? null, 'response')
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <Clock className={cn("h-3 w-3 sm:h-4 sm:w-4", getStatusColor(metrics?.avgFirstResponseTime ?? null, 'response'))} />
              <span className={cn(
                "text-[10px] sm:text-xs truncate font-medium",
                isDarkMode ? "text-gray-300" : "text-gray-600"
              )}>
                Tempo Médio 1º Atendimento
              </span>
            </div>
            <motion.div
              key={formatResponseTime(metrics?.avgFirstResponseTime ?? null)}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold",
                getStatusColor(metrics?.avgFirstResponseTime ?? null, 'response')
              )}
            >
              {formatResponseTime(metrics?.avgFirstResponseTime ?? null)}
            </motion.div>
          </motion.div>

          {/* Tempo Médio WhatsApp */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-2 sm:p-3 rounded-xl shadow-lg border bg-gradient-to-br transition-all hover:scale-[1.02]",
              getStatusBg(metrics?.avgWhatsAppResponseTime ?? null, 'whatsapp')
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <MessageCircle className={cn("h-3 w-3 sm:h-4 sm:w-4", getStatusColor(metrics?.avgWhatsAppResponseTime ?? null, 'whatsapp'))} />
              <span className={cn(
                "text-[10px] sm:text-xs truncate font-medium",
                isDarkMode ? "text-gray-300" : "text-gray-600"
              )}>
                Tempo Médio WhatsApp
              </span>
            </div>
            <motion.div
              key={formatResponseTime(metrics?.avgWhatsAppResponseTime ?? null)}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold",
                getStatusColor(metrics?.avgWhatsAppResponseTime ?? null, 'whatsapp')
              )}
            >
              {formatResponseTime(metrics?.avgWhatsAppResponseTime ?? null)}
            </motion.div>
          </motion.div>

          {/* Aguardando Resposta */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "p-2 sm:p-3 rounded-xl shadow-lg border bg-gradient-to-br transition-all hover:scale-[1.02]",
              getAlertBg(metrics?.leadsWithoutResponse ?? 0)
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <AlertTriangle className={cn("h-3 w-3 sm:h-4 sm:w-4", getAlertLevel(metrics?.leadsWithoutResponse ?? 0))} />
              <span className={cn(
                "text-[10px] sm:text-xs truncate font-medium",
                isDarkMode ? "text-gray-300" : "text-gray-600"
              )}>
                Aguardando Resposta
              </span>
            </div>
            <motion.div
              key={metrics?.leadsWithoutResponse}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold",
                getAlertLevel(metrics?.leadsWithoutResponse ?? 0)
              )}
            >
              {metrics?.leadsWithoutResponse ?? 0}
            </motion.div>
          </motion.div>

          {/* Nunca Contatados */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "p-2 sm:p-3 rounded-xl shadow-lg border bg-gradient-to-br transition-all hover:scale-[1.02]",
              getAlertBg(metrics?.leadsNeverContacted ?? 0)
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <UserX className={cn("h-3 w-3 sm:h-4 sm:w-4", getAlertLevel(metrics?.leadsNeverContacted ?? 0))} />
              <span className={cn(
                "text-[10px] sm:text-xs truncate font-medium",
                isDarkMode ? "text-gray-300" : "text-gray-600"
              )}>
                Nunca Contatados
              </span>
            </div>
            <motion.div
              key={metrics?.leadsNeverContacted}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold",
                getAlertLevel(metrics?.leadsNeverContacted ?? 0)
              )}
            >
              {metrics?.leadsNeverContacted ?? 0}
            </motion.div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}