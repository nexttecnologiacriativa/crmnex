import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppointmentMetrics } from '@/hooks/useAppointmentMetrics';
import { cn } from '@/lib/utils';

interface TVAppointmentsCardProps {
  isDarkMode?: boolean;
}

export default function TVAppointmentsCard({ isDarkMode }: TVAppointmentsCardProps) {
  const { metrics, isLoading } = useAppointmentMetrics('day');

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

  const attendanceRate = metrics?.taxa_comparecimento ?? 0;
  const failureRate = metrics?.taxa_falhas ?? 0;

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
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Agendamentos Hoje
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
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-2 sm:p-3 rounded-lg text-center",
              isDarkMode ? "bg-gray-700/50" : "bg-blue-500/10"
            )}
          >
            <div className={cn(
              "text-[10px] sm:text-xs mb-0.5",
              isDarkMode ? "text-gray-300" : "text-muted-foreground"
            )}>
              Agendados
            </div>
            <motion.div
              key={metrics?.scheduledForToday}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-xl sm:text-2xl lg:text-3xl font-bold text-blue-500"
              )}
            >
              {metrics?.scheduledForToday ?? 0}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-2 sm:p-3 rounded-lg text-center",
              isDarkMode ? "bg-gray-700/50" : "bg-purple-500/10"
            )}
          >
            <div className={cn(
              "text-[10px] sm:text-xs mb-0.5",
              isDarkMode ? "text-gray-300" : "text-muted-foreground"
            )}>
              Próximos
            </div>
            <motion.div
              key={metrics?.upcomingToday?.length ?? 0}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "text-xl sm:text-2xl lg:text-3xl font-bold text-purple-500"
              )}
            >
              {metrics?.upcomingToday?.length ?? 0}
            </motion.div>
          </motion.div>
        </div>

        {/* Attendance Rates */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "p-2 sm:p-3 rounded-lg",
              isDarkMode ? "bg-gray-700/50" : "bg-green-500/10"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              <span className={cn(
                "text-[10px] sm:text-xs",
                isDarkMode ? "text-gray-300" : "text-muted-foreground"
              )}>
                Compareceram
              </span>
            </div>
            <div className="flex items-end gap-2">
              <motion.span
                key={attendanceRate}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-lg sm:text-xl lg:text-2xl font-bold text-green-500"
              >
                {attendanceRate}%
              </motion.span>
            </div>
            <div className="mt-1.5 h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${attendanceRate}%` }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="h-full bg-green-500 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "p-2 sm:p-3 rounded-lg",
              isDarkMode ? "bg-gray-700/50" : "bg-red-500/10"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              <span className={cn(
                "text-[10px] sm:text-xs",
                isDarkMode ? "text-gray-300" : "text-muted-foreground"
              )}>
                Falharam
              </span>
            </div>
            <div className="flex items-end gap-2">
              <motion.span
                key={failureRate}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-lg sm:text-xl lg:text-2xl font-bold text-red-500"
              >
                {failureRate}%
              </motion.span>
            </div>
            <div className="mt-1.5 h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${failureRate}%` }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="h-full bg-red-500 rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Next Appointments */}
        {metrics?.upcomingToday && metrics.upcomingToday.length > 0 && (
          <div>
            <div className={cn(
              "text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5",
              isDarkMode ? "text-gray-300" : "text-muted-foreground"
            )}>
              <Clock className="h-3 w-3" />
              Próximos Agendamentos
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              {metrics.upcomingToday.slice(0, 3).map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className={cn(
                    "flex items-center justify-between p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm",
                    isDarkMode ? "bg-gray-700/30" : "bg-gray-50"
                  )}
                >
                  <span className={cn(
                    "truncate flex-1",
                    isDarkMode ? "text-white" : ""
                  )}>
                    {apt.title}
                  </span>
                  <span className={cn(
                    "font-medium ml-2",
                    isDarkMode ? "text-gray-300" : "text-primary"
                  )}>
                    {apt.scheduled_time}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
