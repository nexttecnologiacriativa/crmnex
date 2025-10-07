import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useTVDashboardSettings } from '@/hooks/useTVDashboardSettings';
import { useState, useEffect } from 'react';

interface TVSettingsProps {
  onClose: () => void;
}

export default function TVSettings({ onClose }: TVSettingsProps) {
  const { settings, updateSettings } = useTVDashboardSettings();
  const [revenueGoal, setRevenueGoal] = useState('100000');

  useEffect(() => {
    if (settings?.revenue_goal) {
      setRevenueGoal(settings.revenue_goal.toString());
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      revenue_goal: Number(revenueGoal),
    });
    onClose();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Configurações do Dashboard TV</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="revenue-goal">Meta de Receita Mensal (R$)</Label>
          <Input
            id="revenue-goal"
            type="number"
            value={revenueGoal}
            onChange={(e) => setRevenueGoal(e.target.value)}
            placeholder="100000"
          />
          <p className="text-xs text-muted-foreground">
            Esta meta será usada para calcular o progresso no card de Receita do Mês
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

