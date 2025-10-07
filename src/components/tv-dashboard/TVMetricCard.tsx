import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TVMetricCardProps {
  title: string;
  value: number;
  change?: number;
  goal?: number;
  icon: string;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'secondary';
  prefix?: string;
  suffix?: string;
  isDarkMode?: boolean;
}

export default function TVMetricCard({
  title,
  value,
  change,
  goal,
  icon,
  variant = 'primary',
  prefix = '',
  suffix = '',
  isDarkMode = true,
}: TVMetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsUpdating(true);
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = displayValue;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
        setTimeout(() => setIsUpdating(false), 500);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const variantStyles = {
    primary: isDarkMode 
      ? 'bg-gradient-to-br from-[hsl(209,100%,22%)] to-[hsl(209,80%,30%)] border-0 shadow-lg shadow-[hsl(209,100%,22%)]/30'
      : 'bg-gradient-to-br from-[hsl(209,70%,70%)] to-[hsl(209,60%,75%)] border border-white/40 shadow-lg shadow-[hsl(209,70%,70%)]/20',
    success: isDarkMode
      ? 'bg-gradient-to-br from-[hsl(87,57%,51%)] to-[hsl(87,57%,40%)] border-0 shadow-lg shadow-[hsl(87,57%,51%)]/30'
      : 'bg-gradient-to-br from-[hsl(87,50%,75%)] to-[hsl(87,45%,70%)] border border-white/40 shadow-lg shadow-[hsl(87,50%,75%)]/20',
    warning: isDarkMode
      ? 'bg-gradient-to-br from-[hsl(209,80%,30%)] to-[hsl(209,70%,25%)] border-0 shadow-lg shadow-[hsl(209,80%,30%)]/30'
      : 'bg-gradient-to-br from-[hsl(209,65%,75%)] to-[hsl(209,60%,70%)] border border-white/40 shadow-lg shadow-[hsl(209,65%,75%)]/20',
    info: isDarkMode
      ? 'bg-gradient-to-br from-[hsl(209,90%,35%)] to-[hsl(209,80%,25%)] border-0 shadow-lg shadow-[hsl(209,90%,35%)]/30'
      : 'bg-gradient-to-br from-[hsl(209,75%,72%)] to-[hsl(209,70%,68%)] border border-white/40 shadow-lg shadow-[hsl(209,75%,72%)]/20',
    secondary: isDarkMode
      ? 'bg-gradient-to-br from-[hsl(87,57%,45%)] to-[hsl(87,50%,35%)] border-0 shadow-lg shadow-[hsl(87,57%,45%)]/30'
      : 'bg-gradient-to-br from-[hsl(87,48%,72%)] to-[hsl(87,45%,68%)] border border-white/40 shadow-lg shadow-[hsl(87,48%,72%)]/20',
  };

  const goalProgress = goal ? (value / goal) * 100 : null;
  const isAboveGoal = goalProgress && goalProgress >= 100;
  const isNearGoal = goalProgress && goalProgress >= 80 && goalProgress < 100;

  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ 
        scale: isUpdating ? [1, 1.02, 1] : 1,
        boxShadow: isUpdating ? [
          '0 0 0px rgba(var(--primary), 0)',
          '0 0 20px rgba(var(--primary), 0.3)',
          '0 0 0px rgba(var(--primary), 0)'
        ] : '0 0 0px rgba(var(--primary), 0)'
      }}
      transition={{ duration: 0.5 }}
    >
      <Card className={cn('p-4 transition-all hover:scale-105 relative overflow-hidden shadow-2xl h-full', variantStyles[variant])}>
        {isUpdating && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1s_ease-in-out]" 
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 1s ease-in-out'
            }}
          />
        )}
        
        <div className="flex items-center justify-between mb-3">
          <motion.span 
            className="text-3xl drop-shadow-lg"
            animate={{ rotate: isUpdating ? [0, 10, -10, 0] : 0 }}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.span>
          {change !== undefined && (
            <motion.div 
              className={cn(
                'flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full',
                isDarkMode ? 'text-white bg-white/20' : 'text-[hsl(209,100%,22%)] bg-white/60'
              )}
              animate={{ scale: isUpdating ? [1, 1.1, 1] : 1 }}
            >
              {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(change)}%
            </motion.div>
          )}
        </div>

        <div className="space-y-2 relative z-10">
          <p className={cn(
            "text-sm font-semibold",
            isDarkMode ? "text-white/80" : "text-[hsl(209,100%,22%)]/70"
          )}>{title}</p>
          <motion.p 
            className={cn(
              "text-3xl font-bold drop-shadow-lg",
              isDarkMode ? "text-white" : "text-[hsl(209,100%,22%)]"
            )}
            animate={{ 
              scale: isUpdating ? [1, 1.05, 1] : 1
            }}
            transition={{ duration: 0.5 }}
          >
            {prefix}
            {displayValue.toLocaleString('pt-BR')}
            {suffix}
          </motion.p>

        {goal && (
          <div className="space-y-1 mt-2">
            <div className={cn(
              "flex justify-between text-xs font-semibold",
              isDarkMode ? "text-white/70" : "text-[hsl(209,100%,22%)]/60"
            )}>
              <span>Meta: {prefix}{goal.toLocaleString('pt-BR')}{suffix}</span>
              <span className={cn(
                'font-bold px-2 rounded-full',
                isDarkMode ? 'text-white bg-white/20' : 'text-[hsl(209,100%,22%)] bg-white/60'
              )}>
                {goalProgress?.toFixed(0)}%
              </span>
            </div>
            <div className={cn(
              "w-full rounded-full h-2",
              isDarkMode ? "bg-white/20" : "bg-white/40"
            )}>
              <motion.div
                className={cn(
                  'h-2 rounded-full transition-all duration-1000',
                  isAboveGoal && (isDarkMode ? 'bg-white' : 'bg-[hsl(87,57%,51%)]'),
                  isNearGoal && (isDarkMode ? 'bg-yellow-300' : 'bg-[hsl(87,50%,60%)]'),
                  !isAboveGoal && !isNearGoal && (isDarkMode ? 'bg-white/50' : 'bg-[hsl(209,100%,22%)]/40')
                )}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(goalProgress || 0, 100)}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        )}
        </div>
      </Card>
    </motion.div>
  );
}

