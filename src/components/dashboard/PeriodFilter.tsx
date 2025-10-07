import { Button } from '@/components/ui/button';
import { PeriodFilter as PeriodFilterType } from '@/hooks/useAppointmentMetrics';

interface PeriodFilterProps {
  value: PeriodFilterType;
  onChange: (period: PeriodFilterType) => void;
}

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const periods: { value: PeriodFilterType; label: string }[] = [
    { value: 'day', label: 'Hoje' },
    { value: 'month', label: 'Mês' },
    { value: 'year', label: 'Ano' },
  ];

  return (
    <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={value === period.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(period.value)}
          className={value === period.value ? 'bg-nexcrm-green hover:bg-nexcrm-green/90' : ''}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
