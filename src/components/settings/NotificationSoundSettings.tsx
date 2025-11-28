import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { useNotificationSound, SOUND_OPTIONS } from '@/hooks/useNotificationSound';
import { toast } from '@/hooks/use-toast';

export default function NotificationSoundSettings() {
  const { 
    settings, 
    updateSettings, 
    testSound, 
    isWhatsAppEnabled, 
    isLeadEnabled 
  } = useNotificationSound();

  const handleUpdateSettings = async (field: string, value: any) => {
    try {
      await updateSettings.mutateAsync({ [field]: value });
      toast({
        title: "Configuração salva",
        description: "Suas preferências de notificação foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as configurações.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔔 Alertas Sonoros</CardTitle>
          <CardDescription>
            Configure sons de notificação para mensagens WhatsApp e novos leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuração de Som WhatsApp */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">📱 Mensagens WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Tocar som quando receber nova mensagem no atendimento
                </p>
              </div>
              <Switch
                checked={isWhatsAppEnabled}
                onCheckedChange={(checked) => handleUpdateSettings('whatsapp_sound_enabled', checked)}
              />
            </div>

            {isWhatsAppEnabled && (
              <div className="flex items-end gap-2 pl-6">
                <div className="flex-1">
                  <Label>Tipo de Som</Label>
                  <Select
                    value={settings?.whatsapp_sound_type || 'notification-1'}
                    onValueChange={(value) => handleUpdateSettings('whatsapp_sound_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_OPTIONS.map((sound) => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => testSound(settings?.whatsapp_sound_type || 'notification-1')}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Configuração de Som Leads */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">💰 Novos Leads</Label>
                <p className="text-sm text-muted-foreground">
                  Tocar som quando um novo lead entrar no pipeline
                </p>
              </div>
              <Switch
                checked={isLeadEnabled}
                onCheckedChange={(checked) => handleUpdateSettings('lead_sound_enabled', checked)}
              />
            </div>

            {isLeadEnabled && (
              <div className="flex items-end gap-2 pl-6">
                <div className="flex-1">
                  <Label>Tipo de Som</Label>
                  <Select
                    value={settings?.lead_sound_type || 'notification-1'}
                    onValueChange={(value) => handleUpdateSettings('lead_sound_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_OPTIONS.map((sound) => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => testSound(settings?.lead_sound_type || 'notification-1')}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
