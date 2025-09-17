
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { 
  MessageCircle, 
  Clock, 
  Phone, 
  User,
  Plus,
  RefreshCw,
  CheckCheck,
  Check,
  Trash2,
  UserPlus
} from 'lucide-react';
import { useWhatsAppConversations, useDeleteConversation } from '@/hooks/useWhatsApp';
import { useWhatsAppOfficialConfig } from '@/hooks/useWhatsAppOfficial';
import CreateConversationDialog from './CreateConversationDialog';
import CreateLeadFromConversationDialog from './CreateLeadFromConversationDialog';
import ConversationDetail from './ConversationDetail';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { getLeadDisplayName } from '@/lib/leadUtils';

export default function ConversationHistory() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLeadDialog, setCreateLeadDialog] = useState<{
    open: boolean;
    phoneNumber: string;
    contactName?: string;
    conversationId: string;
  }>({
    open: false,
    phoneNumber: '',
    conversationId: ''
  });
  
  const { data: conversations = [], isLoading, refetch } = useWhatsAppConversations();
  const { data: config } = useWhatsAppOfficialConfig();
  const deleteConversation = useDeleteConversation();

  const isConfigured = config?.is_active && config?.access_token && config?.phone_number_id;

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que clique abra a conversa
    
    if (confirm('Tem certeza que deseja apagar esta conversa? Esta ação não pode ser desfeita.')) {
      try {
        await deleteConversation.mutateAsync({ conversationId });
      } catch (error) {
        console.error('Error deleting conversation:', error);
      }
    }
  };

  const handleCreateLead = (phoneNumber: string, contactName: string | undefined, conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCreateLeadDialog({
      open: true,
      phoneNumber,
      contactName,
      conversationId
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="flex items-center justify-center bg-white rounded-lg p-6 shadow-sm">
          <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
          <span className="ml-2 text-gray-600">Carregando conversas...</span>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center py-8">
            <div className="bg-yellow-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-10 w-10 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp não configurado</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Configure a API oficial do WhatsApp nas configurações para ver as conversas e receber mensagens automaticamente.
            </p>
            <Button 
              onClick={() => window.location.href = '/settings'}
              className="bg-green-600 hover:bg-green-700"
            >
              Ir para Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedConversationId) {
    return (
      <ConversationDetail
        conversationId={selectedConversationId}
        onBack={() => setSelectedConversationId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-green-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <MessageCircle className="h-5 w-5" />
              Conversas do WhatsApp
              <Badge className="bg-green-100 text-green-700 ml-2">
                {conversations.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Conversa
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma conversa encontrada</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                As conversas do WhatsApp aparecerão aqui quando você receber mensagens ou iniciar novas conversas.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Iniciar Nova Conversa
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <div 
                  key={conversation.id} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-l-green-500 group relative"
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                      <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                        <AvatarInitials name={conversation.contact_name || conversation.phone_number} />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {conversation.contact_name || (conversation.leads ? getLeadDisplayName(conversation.leads) : 'Contato não identificado')}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(conversation.last_message_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                          {!conversation.is_read && (
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{conversation.phone_number}</span>
                        </div>
                        
                        {conversation.leads?.email && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{conversation.leads.email}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MessageCircle className="h-3 w-3" />
                          <span>{conversation.message_count || 0} mensagens</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!conversation.is_read && (
                            <Badge className="bg-green-500 text-white text-xs">
                              Nova
                            </Badge>
                          )}
                          
                          {/* Botão para criar lead se não existir */}
                          {!conversation.lead_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleCreateLead(conversation.phone_number, conversation.contact_name, conversation.id, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="Criar Lead"
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteConversation(conversation.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteConversation.isPending}
                            title="Apagar Conversa"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateConversationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <CreateLeadFromConversationDialog
        open={createLeadDialog.open}
        onOpenChange={(open) => setCreateLeadDialog(prev => ({ ...prev, open }))}
        phoneNumber={createLeadDialog.phoneNumber}
        contactName={createLeadDialog.contactName}
        conversationId={createLeadDialog.conversationId}
        onLeadCreated={() => {
          refetch(); // Atualizar lista de conversas
          setCreateLeadDialog(prev => ({ ...prev, open: false }));
        }}
      />
    </div>
  );
}
