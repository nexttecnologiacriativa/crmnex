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
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isDarkMode ? "bg-white/10" : "bg-nexcrm-blue/10"
            )}>
              <Calendar className={cn(
                "h-6 w-6",
                isDarkMode ? "text-white" : "text-nexcrm-blue"
              )} />
            </div>
            <div>
              <h3 className={cn(
                "text-xl font-bold",
                isDarkMode ? "text-white" : "text-nexcrm-blue"
              )}>
                Agendamentos Hoje
              </h3>
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-white/60" : "text-gray-500"
              )}>
                Acompanhamento em tempo real
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-5">
          {/* Total */}
          <div className={cn(
            "p-4 rounded-lg",
            isDarkMode ? "bg-white/5" : "bg-nexcrm-blue/5"
          )}>
            <p className={cn(
              "text-xs font-medium mb-1",
              isDarkMode ? "text-white/70" : "text-gray-600"
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

          {/* Taxa de Comparecimento */}
          <div className={cn(
            "p-4 rounded-lg",
            isDarkMode ? "bg-green-500/10" : "bg-green-50"
          )}>
            <p className={cn(
              "text-xs font-medium mb-1",
              isDarkMode ? "text-green-300" : "text-green-700"
            )}>
              Taxa
            </p>
            <motion.p
              key={metrics.taxa_comparecimento}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-3xl font-bold",
                isDarkMode ? "text-green-400" : "text-green-600"
              )}
            >
              {metrics.taxa_comparecimento}%
            </motion.p>
          </div>

          {/* Status individuais */}
          {[
            { key: 'aguardando', label: 'Aguardando', color: isDarkMode ? 'text-gray-300' : 'text-gray-600' },
            { key: 'compareceu', label: 'Compareceu', color: isDarkMode ? 'text-green-400' : 'text-green-600' },
            { key: 'falhou', label: 'Faltaram', color: isDarkMode ? 'text-red-400' : 'text-red-600' },
          ].map(({ key, label, color }) => (
            <div
              key={key}
              className={cn(
                "p-4 rounded-lg",
                isDarkMode ? "bg-white/5" : "bg-gray-50"
              )}
            >
              <p className={cn(
                "text-xs font-medium mb-1",
                isDarkMode ? "text-white/70" : "text-gray-600"
              )}>
                {label}
              </p>
              <motion.p
                key={metrics.byStatus[key as keyof typeof metrics.byStatus]}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn("text-3xl font-bold", color)}
              >
                {metrics.byStatus[key as keyof typeof metrics.byStatus]}
              </motion.p>
            </div>
          ))}
        </div>

        {/* Próximos agendamentos */}
        {metrics.upcomingToday.length > 0 && (
          <div className={cn(
            "p-4 rounded-lg",
            isDarkMode ? "bg-white/5" : "bg-gray-50"
          )}>
            <p className={cn(
              "text-sm font-bold mb-3 flex items-center gap-2",
              isDarkMode ? "text-white/90" : "text-gray-900"
            )}>
              <Clock className="h-4 w-4" />
              Próximos Agendamentos
            </p>
            <div className="grid grid-cols-3 gap-2">
              {metrics.upcomingToday.slice(0, 3).map((apt) => (
                <div
                  key={apt.id}
                  className={cn(
                    "p-3 rounded-lg",
                    isDarkMode ? "bg-white/5" : "bg-white"
                  )}
                >
                  <p className={cn(
                    "font-semibold text-sm mb-1 truncate",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    {apt.title}
                  </p>
                  <p className={cn(
                    "text-xs mb-1",
                    isDarkMode ? "text-white/60" : "text-gray-500"
                  )}>
                    {apt.scheduled_time}
                  </p>
                  <p className={cn(
                    "text-xs truncate",
                    isDarkMode ? "text-white/50" : "text-gray-400"
                  )}>
                    {apt.lead_name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
