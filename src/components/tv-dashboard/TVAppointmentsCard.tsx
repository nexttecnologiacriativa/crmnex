import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { useAppointmentMetrics } from '@/hooks/useAppointmentMetrics';
import { cn } from '@/lib/utils';

interface TVAppointmentsCardProps {
  isDarkMode?: boolean;
}

const statusConfig = {
  aguardando: { label: 'Aguardando', color: '#6b7280', icon: '⏳' },
  compareceu: { label: 'Compareceu', color: '#10b981', icon: '✅' },
  nao_qualificado: { label: 'Não Qualificado', color: '#f59e0b', icon: '⚠️' },
  reagendado: { label: 'Reagendado', color: '#3b82f6', icon: '🔄' },
  falhou: { label: 'Faltou', color: '#ef4444', icon: '❌' },
};

export default function TVAppointmentsCard({ isDarkMode }: TVAppointmentsCardProps) {
  const { metrics } = useAppointmentMetrics('day');

  return (
    <Card className={cn(
      "h-full border-0 shadow-xl overflow-hidden",
      isDarkMode ? "bg-white/10 backdrop-blur-md" : "bg-white"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className={cn(
            "h-5 w-5",
            isDarkMode ? "text-white" : "text-nexcrm-blue"
          )} />
          <h3 className={cn(
            "text-lg font-bold",
            isDarkMode ? "text-white" : "text-nexcrm-blue"
          )}>
            Agendamentos Hoje
          </h3>
        </div>

        <div className="space-y-4">
          {/* Total e Taxa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={cn(
                "text-xs mb-1",
                isDarkMode ? "text-white/70" : "text-muted-foreground"
              )}>
                Total
              </p>
              <motion.p
                key={metrics.total}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "text-3xl font-bold",
                  isDarkMode ? "text-white" : "text-nexcrm-blue"
                )}
              >
                {metrics.total}
              </motion.p>
            </div>
            <div>
              <p className={cn(
                "text-xs mb-1",
                isDarkMode ? "text-white/70" : "text-muted-foreground"
              )}>
                Taxa
              </p>
              <motion.p
                key={metrics.taxa_comparecimento}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-green-500"
              >
                {metrics.taxa_comparecimento}%
              </motion.p>
            </div>
          </div>

          {/* Status compacto */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(metrics.byStatus).map(([status, count]) => {
              const config = statusConfig[status as keyof typeof statusConfig];
              return (
                <div
                  key={status}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded",
                    isDarkMode ? "bg-white/5" : "bg-gray-50"
                  )}
                >
                  <span>{config.icon}</span>
                  <span className={isDarkMode ? "text-white/80" : "text-gray-700"}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Próximos agendamentos */}
          {metrics.upcomingToday.length > 0 && (
            <div className="space-y-2">
              <p className={cn(
                "text-xs font-semibold flex items-center gap-1",
                isDarkMode ? "text-white/90" : "text-gray-700"
              )}>
                <Clock className="h-3 w-3" />
                Próximos
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {metrics.upcomingToday.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "text-xs p-2 rounded",
                      isDarkMode ? "bg-white/5" : "bg-gray-50"
                    )}
                  >
                    <p className={cn(
                      "font-medium truncate",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                      {apt.title}
                    </p>
                    <p className={cn(
                      "truncate",
                      isDarkMode ? "text-white/60" : "text-gray-500"
                    )}>
                      {apt.scheduled_time} - {apt.lead_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
