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
    primary: 'border-primary/20 bg-primary/5',
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
    secondary: 'border-purple-500/20 bg-purple-500/5',
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
      <Card className={cn('p-6 transition-all hover:scale-105 relative overflow-hidden', variantStyles[variant])}>
        {isUpdating && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1s_ease-in-out]" 
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 1s ease-in-out'
            }}
          />
        )}
        
        <div className="flex items-center justify-between mb-4">
          <motion.span 
            className="text-4xl"
            animate={{ rotate: isUpdating ? [0, 10, -10, 0] : 0 }}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.span>
          {change !== undefined && (
            <motion.div 
              className={cn('flex items-center gap-1 text-sm font-medium', change >= 0 ? 'text-green-600' : 'text-red-600')}
              animate={{ scale: isUpdating ? [1, 1.1, 1] : 1 }}
            >
              {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(change)}%
            </motion.div>
          )}
        </div>

        <div className="space-y-2 relative z-10">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <motion.p 
            className="text-4xl font-bold"
            animate={{ 
              color: isUpdating ? ['currentColor', 'hsl(var(--primary))', 'currentColor'] : 'currentColor'
            }}
            transition={{ duration: 0.5 }}
          >
            {prefix}
            {displayValue.toLocaleString('pt-BR')}
            {suffix}
          </motion.p>

        {goal && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Meta: {prefix}{goal.toLocaleString('pt-BR')}{suffix}</span>
              <span className={cn(
                'font-bold',
                isAboveGoal && 'text-green-600',
                isNearGoal && 'text-yellow-600',
                !isAboveGoal && !isNearGoal && 'text-red-600'
              )}>
                {goalProgress?.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-1000',
                  isAboveGoal && 'bg-green-500',
                  isNearGoal && 'bg-yellow-500',
                  !isAboveGoal && !isNearGoal && 'bg-red-500'
                )}
                style={{ width: `${Math.min(goalProgress || 0, 100)}%` }}
              />
            </div>
          </div>
        )}
        </div>
      </Card>
    </motion.div>
  );
}

