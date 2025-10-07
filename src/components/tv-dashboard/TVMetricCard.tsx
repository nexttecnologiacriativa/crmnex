import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
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
    <Card className={cn('p-6 transition-all hover:scale-105', variantStyles[variant])}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">{icon}</span>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-sm font-medium', change >= 0 ? 'text-green-600' : 'text-red-600')}>
            {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-4xl font-bold">
          {prefix}
          {displayValue.toLocaleString('pt-BR')}
          {suffix}
        </p>

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
  );
}
