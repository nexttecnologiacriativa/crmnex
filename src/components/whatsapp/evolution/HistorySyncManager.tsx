import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  RotateCcw,
  Clock,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Settings,
  Users
} from 'lucide-react';
import { useWhatsAppHistorySync, useWhatsAppSyncStatus } from '@/hooks/useWhatsAppSync';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistorySyncManagerProps {
  instanceName: string;
  isConnected: boolean;
}

export default function HistorySyncManager({ instanceName, isConnected }: HistorySyncManagerProps) {
  const { syncFullHistory, syncConversationsOnly, isLoading, syncProgress } = useWhatsAppHistorySync();
  const { data: syncStatuses } = useWhatsAppSyncStatus();
  
  const [syncOptions, setSyncOptions] = useState({
    messageLimit: 100,
    daysBack: 30,
    includeMedia: true,
    onlyNewMessages: false
  });

  const lastSync = syncStatuses?.find(s => s.instance_name === instanceName);

  const handleFullSync = () => {
    syncFullHistory({ instanceName, syncOptions });
  };

  const handleConversationsSync = () => {
    syncConversationsOnly(instanceName);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Sincronização de Histórico
          </CardTitle>
          {lastSync && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <Clock className="h-3 w-3 mr-1" />
              Última sync: {formatDistanceToNow(new Date(lastSync.last_sync_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status da Instância */}
        <div className={`p-4 rounded-lg border ${
          isConnected 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            <h3 className={`font-semibold ${
              isConnected ? 'text-green-900' : 'text-yellow-900'
            }`}>
              Status da Instância
            </h3>
          </div>
          <p className={`text-sm ${
            isConnected ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {isConnected 
              ? 'Instância conectada - pronta para sincronização'
              : 'Instância desconectada - conecte primeiro para sincronizar'
            }
          </p>
        </div>

        {/* Progresso da Sincronização */}
        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sincronizando...</span>
              <span className="text-sm text-muted-foreground">{syncProgress}</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Última Sincronização */}
        {lastSync && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-600">Conversas</p>
              <p className="text-lg font-bold text-blue-900">{lastSync.processed_conversations}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <MessageSquare className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-600">Mensagens</p>
              <p className="text-lg font-bold text-green-900">{lastSync.total_messages}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-purple-600">Tempo</p>
              <p className="text-sm font-bold text-purple-900">
                {formatDistanceToNow(new Date(lastSync.last_sync_at), { locale: ptBR })}
              </p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-yellow-600">Erros</p>
              <p className="text-lg font-bold text-yellow-900">{lastSync.errors?.length || 0}</p>
            </div>
          </div>
        )}

        {/* Configurações de Sincronização */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4" />
            <h3 className="font-semibold">Configurações de Sincronização</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="messageLimit">Limite de Mensagens por Conversa</Label>
              <Input
                id="messageLimit"
                type="number"
                value={syncOptions.messageLimit}
                onChange={(e) => setSyncOptions(prev => ({
                  ...prev,
                  messageLimit: parseInt(e.target.value) || 100
                }))}
                min="10"
                max="1000"
                step="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysBack">Dias para Sincronizar</Label>
              <Input
                id="daysBack"
                type="number"
                value={syncOptions.daysBack}
                onChange={(e) => setSyncOptions(prev => ({
                  ...prev,
                  daysBack: parseInt(e.target.value) || 30
                }))}
                min="1"
                max="365"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="includeMedia">Incluir Mídia</Label>
              <p className="text-xs text-muted-foreground">Sincronizar imagens, vídeos e áudios</p>
            </div>
            <Switch
              id="includeMedia"
              checked={syncOptions.includeMedia}
              onCheckedChange={(checked) => setSyncOptions(prev => ({
                ...prev,
                includeMedia: checked
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="onlyNewMessages">Apenas Novas Mensagens</Label>
              <p className="text-xs text-muted-foreground">Pular mensagens já sincronizadas</p>
            </div>
            <Switch
              id="onlyNewMessages"
              checked={syncOptions.onlyNewMessages}
              onCheckedChange={(checked) => setSyncOptions(prev => ({
                ...prev,
                onlyNewMessages: checked
              }))}
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Button
            onClick={handleFullSync}
            disabled={!isConnected || isLoading}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Sincronizar Histórico Completo
          </Button>

          <Button
            variant="outline"
            onClick={handleConversationsSync}
            disabled={!isConnected || isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Apenas Conversas
          </Button>
        </div>

        {/* Avisos */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>• A sincronização pode demorar dependendo da quantidade de mensagens</p>
          <p>• Mensagens antigas podem não ter mídia disponível</p>
          <p>• A sincronização não afeta mensagens futuras (webhook já configurado)</p>
        </div>
      </CardContent>
    </Card>
  );
}