import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstance';
import { ChatBox } from './ChatBox';
import { ConversationSidebar } from './ConversationSidebar';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Phone, Video, MoreVertical, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhatsAppConversation {
  id: string;
  phone_number: string;
  contact_name: string;
  last_message_at: string;
  is_read: boolean;
  message_count: number;
  workspace_id: string;
}

export function CanalDeComunicacao() {
  const { currentWorkspace } = useWorkspace();
  const { data: instances = [], isLoading: instancesLoading } = useWhatsAppInstances();
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Verificar se há instâncias disponíveis
  const activeInstance = instances.find(instance => instance.status === 'open');
  const hasInstances = instances.length > 0;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleConversationSelect = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  if (!currentWorkspace) {
    return (
      <Card className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Selecione um workspace para continuar</p>
        </div>
      </Card>
    );
  }

  // Verificar se há instâncias configuradas
  if (!instancesLoading && !hasInstances) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuração Necessária</h3>
            <p className="text-muted-foreground mb-4">
              Você precisa configurar pelo menos uma instância do WhatsApp para usar o Canal de Comunicação.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              <Settings className="h-4 w-4 mr-2" />
              Ir para Configurações
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Layout móvel - mostrar apenas uma tela por vez
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {!selectedConversation ? (
          <ConversationSidebar
            workspaceId={currentWorkspace.id}
            selectedConversationId={null}
            onConversationSelect={handleConversationSelect}
            className="h-full"
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Header da conversa */}
            <div className="flex items-center gap-3 p-4 border-b bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="p-2"
              >
                ←
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback>
                  {selectedConversation.contact_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  {selectedConversation.contact_name || selectedConversation.phone_number}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.phone_number}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat */}
            <ChatBox
              conversation={selectedConversation}
              workspaceId={currentWorkspace.id}
              className="flex-1"
            />
          </div>
        )}
      </div>
    );
  }

  // Layout desktop - três colunas
  return (
    <div className="h-full flex bg-background">
      {/* Sidebar de conversas */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Canal de Comunicação
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            WhatsApp Business Integration
          </p>
          
          {/* Status da instância */}
          {!activeInstance && hasInstances && (
            <Alert className="mt-3">
              <AlertDescription className="text-xs">
                Instância do WhatsApp desconectada. Verifique as configurações.
              </AlertDescription>
            </Alert>
          )}
          
          {activeInstance && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-muted-foreground">
                Conectado: {activeInstance.instance_name}
              </span>
            </div>
          )}
        </div>
        
        <ConversationSidebar
          workspaceId={currentWorkspace.id}
          selectedConversationId={selectedConversation?.id || null}
          onConversationSelect={handleConversationSelect}
          className="flex-1"
        />
      </div>

      <Separator orientation="vertical" />

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header da conversa */}
            <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback>
                  {selectedConversation.contact_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">
                  {selectedConversation.contact_name || selectedConversation.phone_number}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.phone_number}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat */}
            <ChatBox
              conversation={selectedConversation}
              workspaceId={currentWorkspace.id}
              className="flex-1"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Canal de Comunicação</h3>
              <p className="text-muted-foreground max-w-md">
                Selecione uma conversa para começar a enviar e receber mensagens via WhatsApp
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}