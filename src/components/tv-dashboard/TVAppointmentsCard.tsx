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
        "h-full border-0 shadow-xl rounded-2xl overflow-hidden",
        isDarkMode ? "bg-gray-800/90" : "bg-white"
      )}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </CardContent>
      </Card>
    );
  }

  const attendanceRate = metrics?.taxa_comparecimento ?? 0;
  const failureRate = metrics?.taxa_falhas ?? 0;

  return (
    <Card className={cn(
      "h-full border-0 shadow-xl rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-2xl",
      isDarkMode ? "bg-gray-800/90" : "bg-white"
    )}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
      
      <CardHeader className={cn(
        "pb-2 sm:pb-3 border-b relative",
        isDarkMode 
          ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent border-gray-700/50"
          : "bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-gray-100"
      )}>
        <CardTitle className={cn(
          "text-base sm:text-lg flex items-center gap-2",
          isDarkMode ? "text-white" : "text-gray-800"
        )}>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isDarkMode ? "bg-purple-500/20" : "bg-purple-500/10"
          )}>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
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
      <CardContent className="pt-3 relative">
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-2 sm:p-3 rounded-xl text-center shadow-lg border transition-all hover:scale-[1.02]",
              isDarkMode 
                ? "bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20" 
                : "bg-gradient-to-br from-blue-500/10 to-blue-50 border-blue-100"
            )}
          >
            <div className={cn(
              "text-[10px] sm:text-xs mb-0.5 font-medium",
              isDarkMode ? "text-blue-300" : "text-blue-600"
            )}>
              Agendados
            </div>
            <motion.div
              key={metrics?.scheduledForToday}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-500"
            >
              {metrics?.scheduledForToday ?? 0}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-2 sm:p-3 rounded-xl text-center shadow-lg border transition-all hover:scale-[1.02]",
              isDarkMode 
                ? "bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20" 
                : "bg-gradient-to-br from-purple-500/10 to-purple-50 border-purple-100"
            )}
          >
            <div className={cn(
              "text-[10px] sm:text-xs mb-0.5 font-medium",
              isDarkMode ? "text-purple-300" : "text-purple-600"
            )}>
              Próximos
            </div>
            <motion.div
              key={metrics?.upcomingToday?.length ?? 0}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-500"
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
              "p-2 sm:p-3 rounded-xl shadow-lg border transition-all hover:scale-[1.02]",
              isDarkMode 
                ? "bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/20" 
                : "bg-gradient-to-br from-green-500/10 to-green-50 border-green-100"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              <span className={cn(
                "text-[10px] sm:text-xs font-medium",
                isDarkMode ? "text-green-300" : "text-green-600"
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
            <div className={cn(
              "mt-1.5 h-1.5 sm:h-2 rounded-full overflow-hidden",
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            )}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${attendanceRate}%` }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "p-2 sm:p-3 rounded-xl shadow-lg border transition-all hover:scale-[1.02]",
              isDarkMode 
                ? "bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/20" 
                : "bg-gradient-to-br from-red-500/10 to-red-50 border-red-100"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              <span className={cn(
                "text-[10px] sm:text-xs font-medium",
                isDarkMode ? "text-red-300" : "text-red-600"
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
            <div className={cn(
              "mt-1.5 h-1.5 sm:h-2 rounded-full overflow-hidden",
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            )}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${failureRate}%` }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Next Appointments */}
        {metrics?.upcomingToday && metrics.upcomingToday.length > 0 && (
          <div>
            <div className={cn(
              "text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5",
              isDarkMode ? "text-gray-300" : "text-gray-600"
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
                    "flex items-center justify-between p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm transition-all hover:scale-[1.01]",
                    isDarkMode 
                      ? "bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/30" 
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-100"
                  )}
                >
                  <span className={cn(
                    "truncate flex-1 font-medium",
                    isDarkMode ? "text-white" : "text-gray-700"
                  )}>
                    {apt.title}
                  </span>
                  <span className={cn(
                    "font-semibold ml-2",
                    isDarkMode ? "text-purple-400" : "text-purple-600"
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