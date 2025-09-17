import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebriefingSettings } from '@/hooks/useDebriefings';

interface DebriefingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DebriefingSettingsDialog = ({ open, onOpenChange }: DebriefingSettingsDialogProps) => {
  const { settings, saveSettings, isLoading } = useDebriefingSettings();
  const [fixedCost, setFixedCost] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0);

  useEffect(() => {
    if (settings) {
      setFixedCost(settings.fixed_cost || 0);
      setTaxPercentage(settings.tax_percentage || 0);
    }
  }, [settings]);

  const handleSave = () => {
    saveSettings.mutate(
      { fixed_cost: fixedCost, tax_percentage: taxPercentage },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do Debriefing</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Cálculo Automático</CardTitle>
            <CardDescription>
              Configure os valores para calcular automaticamente o faturamento líquido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fixed-cost">Custo Fixo do Negócio (R$)</Label>
              <Input
                id="fixed-cost"
                type="number"
                step="0.01"
                min="0"
                value={fixedCost}
                onChange={(e) => setFixedCost(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-percentage">Percentual de Imposto (%)</Label>
              <Input
                id="tax-percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Fórmula:</strong><br />
                Faturamento Líquido = Faturamento Bruto - (Custo Fixo + (Faturamento Bruto × % Imposto))
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveSettings.isPending || isLoading}
                className="flex-1"
              >
                {saveSettings.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};