import { useState, useEffect } from 'react';
import { useMarketingSettings, useUpdateMarketingSettings } from '@/hooks/useMarketingSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Clock, Zap } from 'lucide-react';

interface MarketingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MarketingSettingsDialog({ open, onOpenChange }: MarketingSettingsDialogProps) {
  const { data: settings } = useMarketingSettings();
  const updateSettings = useUpdateMarketingSettings();
  
  const [defaultApiType, setDefaultApiType] = useState<'evolution'>('evolution');
  const [evolutionInterval, setEvolutionInterval] = useState(2);
  const [maxMessagesPerMinute, setMaxMessagesPerMinute] = useState(30);

  useEffect(() => {
    if (settings) {
      setDefaultApiType(settings.default_api_type);
      setEvolutionInterval(settings.evolution_message_interval);
      setMaxMessagesPerMinute(settings.max_messages_per_minute);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        default_api_type: defaultApiType,
        evolution_message_interval: evolutionInterval,
        max_messages_per_minute: maxMessagesPerMinute
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Marketing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">API Padrão</CardTitle>
              <CardDescription>
                Selecione a API padrão para novas campanhas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Label>API Configurada</Label>
                <div className="text-sm text-muted-foreground">
                  <p>✅ Evolution API - Sistema configurado para uso exclusivo</p>
                  <p>Mídia, mensagens e templates gerenciados automaticamente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Configurações Evolution API
              </CardTitle>
              <CardDescription>
                Intervalo entre mensagens para evitar bloqueios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="evolution-interval">Intervalo (minutos)</Label>
                <Input
                  id="evolution-interval"
                  type="number"
                  min="1"
                  max="60"
                  value={evolutionInterval}
                  onChange={(e) => setEvolutionInterval(parseInt(e.target.value) || 2)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Limite de Velocidade
              </CardTitle>
              <CardDescription>
                Máximo de mensagens por minuto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min="1"
                max="100"
                value={maxMessagesPerMinute}
                onChange={(e) => setMaxMessagesPerMinute(parseInt(e.target.value) || 30)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}