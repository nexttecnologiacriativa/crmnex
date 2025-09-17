import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Phone, 
  Video, 
  Send, 
  Paperclip, 
  Smile,
  Search,
  Settings,
  Wifi,
  WifiOff,
  Users,
  MoreVertical,
  Camera,
  Mic,
  Download,
  Trash2,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWhatsAppConversations, useCreateConversation, useDeleteConversation } from '@/hooks/useWhatsApp';
import { useSendWhatsAppOfficialMessage } from '@/hooks/useWhatsAppOfficial';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_text: string;
  message_type: 'text' | 'audio' | 'image' | 'video' | 'document';
  is_from_lead: boolean;
  timestamp: string;
  status?: string;
  media_url?: string;
  media_type?: string;
  attachment_name?: string;
}

interface WhatsAppConversation {
  id: string;
  phone_number: string;
  contact_name?: string;
  last_message_at: string;
  is_read: boolean;
  message_count: number;
  leads?: {
    name: string;
    email: string;
  };
}

export default function WhatsAppWebStandalone() {
  const { currentWorkspace } = useWorkspace();
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const sendMessage = useSendWhatsAppOfficialMessage();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  // Buscar conversas
  const { data: conversations = [], refetch: refetchConversations } = useWhatsAppConversations();

  // Buscar mensagens da conversa selecionada
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['whatsapp-messages-standalone', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!selectedConversation,
    refetchInterval: 2000
  });

  // Auto scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filtrar conversas
  const filteredConversations = conversations.filter(conv =>
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone_number?.includes(searchTerm) ||
    conv.leads?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      await sendMessage.mutateAsync({
        to: selectedConversation.phone_number,
        message: messageText,
        conversationId: selectedConversation.id
      });
      
      setMessageText('');
      refetchMessages();
      refetchConversations();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleCreateConversation = async () => {
    if (!newContactPhone.trim() || !currentWorkspace) return;

    try {
      const newConv = await createConversation.mutateAsync({
        workspace_id: currentWorkspace.id,
        phone_number: newContactPhone.replace(/\D/g, ''),
        contact_name: newContactName.trim() || undefined,
      });

      setSelectedConversation(newConv);
      setNewContactPhone('');
      setNewContactName('');
      setShowNewContactDialog(false);
      refetchConversations();
      toast.success('Nova conversa criada!');
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation.mutateAsync({ conversationId });
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      refetchConversations();
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 24) {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (diffInHours < 168) { // 7 dias
      return format(date, 'EEE HH:mm', { locale: ptBR });
    } else {
      return format(date, 'dd/MM HH:mm', { locale: ptBR });
    }
  };

  const getMessageStatus = (message: WhatsAppMessage) => {
    if (message.is_from_lead) return null;
    
    switch (message.status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const renderMessageContent = (message: WhatsAppMessage) => {
    switch (message.message_type) {
      case 'audio':
        if (message.media_url) {
          return (
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg min-w-[200px]">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500">Mensagem de áudio</div>
                <audio controls className="w-full h-8 mt-1">
                  <source src={message.media_url} type="audio/ogg" />
                  <source src={message.media_url} type="audio/mpeg" />
                  Seu navegador não suporta áudio.
                </audio>
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <Mic className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">🎤 Mensagem de áudio</span>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url ? (
              <img 
                src={message.media_url} 
                alt="Imagem" 
                className="max-w-sm rounded-lg cursor-pointer hover:opacity-90"
                onClick={() => window.open(message.media_url, '_blank')}
              />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <Camera className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">📷 Imagem</span>
              </div>
            )}
            {message.message_text && message.message_text !== '📷 Imagem' && (
              <p className="text-sm">{message.message_text}</p>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{message.attachment_name || 'Documento'}</p>
              {message.media_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1"
                  onClick={() => window.open(message.media_url, '_blank')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return <p className="text-sm">{message.message_text}</p>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">WhatsApp API</h2>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Conversa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Telefone *</label>
                      <Input
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="Ex: 5511999999999"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nome (opcional)</label>
                      <Input
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Nome do contato"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateConversation}
                        disabled={!newContactPhone.trim() || createConversation.isPending}
                        className="flex-1"
                      >
                        Criar Conversa
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewContactDialog(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="ghost">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Barra de pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.contact_name || conversation.leads?.name || conversation.phone_number}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.leads?.email && (
                          <Badge variant="secondary" className="mr-1 text-xs">
                            {conversation.leads.email}
                          </Badge>
                        )}
                        {conversation.phone_number}
                      </p>
                      
                      {!conversation.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>

                  {/* Botão de deletar */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja apagar esta conversa? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteConversation(conversation.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Apagar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Área Principal - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.contact_name || 
                       selectedConversation.leads?.name || 
                       selectedConversation.phone_number}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.leads?.email && `${selectedConversation.leads.email} • `}
                      {selectedConversation.phone_number}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 p-4 space-y-4 bg-gray-50">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_from_lead ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-md px-3 py-2 rounded-lg ${
                        message.is_from_lead
                          ? 'bg-white text-gray-900'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {renderMessageContent(message)}
                      
                      <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                        message.is_from_lead ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {!message.is_from_lead && (
                          <span className="ml-1">{getMessageStatus(message)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input de Mensagem */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-3">
                <Button size="sm" variant="ghost">
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="resize-none pr-20"
                    rows={1}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <Button size="sm" variant="ghost">
                      <Smile className="w-4 h-4" />
                    </Button>
                    
                    <Button size="sm" variant="ghost">
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Estado vazio */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                WhatsApp API
              </h3>
              <p className="text-gray-500 max-w-sm">
                Selecione uma conversa para começar a usar o WhatsApp API no seu computador.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}