import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Paperclip, Smile, Search, Settings, Wifi, WifiOff, Users, MoreVertical, Camera, Mic, Download, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWhatsAppConversations, useCreateConversation, useDeleteConversation, useDeleteAllConversations } from '@/hooks/useWhatsApp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import WhatsAppOfficialSender from './WhatsAppOfficialSender';
import AudioPlayer from './AudioPlayer';
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
  message_id?: string;
  permanent_audio_url?: string;
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
export default function WhatsAppOfficialInterface() {
  const {
    currentWorkspace
  } = useWorkspace();

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const deleteAllConversations = useDeleteAllConversations();

  // Verificar se a API está configurada
  const {
    data: whatsappConfig
  } = useQuery({
    queryKey: ['whatsapp-config', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      const {
        data,
        error
      } = await supabase.from('whatsapp_official_configs').select('*').eq('workspace_id', currentWorkspace.id).eq('is_active', true).single();
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configuração WhatsApp:', error);
        return null;
      }
      return data;
    },
    enabled: !!currentWorkspace?.id
  });

  // Buscar conversas
  const {
    data: conversations = [],
    refetch: refetchConversations
  } = useWhatsAppConversations();

  // Buscar mensagens da conversa selecionada
  const {
    data: messages = [],
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['whatsapp-messages-official', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const {
        data,
        error
      } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', selectedConversation.id).order('timestamp', {
        ascending: true
      });
      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!selectedConversation,
    refetchInterval: 2000
  });

  // Auto scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);

  // Se a API não está configurada, mostrar mensagem
  if (!whatsappConfig) {
    return <div className="flex h-screen bg-gray-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              WhatsApp API não configurada
            </h3>
            <p className="text-gray-600 mb-6">
              Configure a API do WhatsApp nas configurações para começar a usar esta funcionalidade.
            </p>
            <Button onClick={() => window.location.href = '/settings'} className="bg-green-600 hover:bg-green-700 text-white">
              Ir para Configurações
            </Button>
          </div>
        </div>
      </div>;
  }

  // Filtrar conversas
  const filteredConversations = conversations.filter(conv => conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || conv.phone_number?.includes(searchTerm) || conv.leads?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const handleCreateConversation = async () => {
    if (!newContactPhone.trim() || !currentWorkspace) return;
    try {
      const newConv = await createConversation.mutateAsync({
        workspace_id: currentWorkspace.id,
        phone_number: newContactPhone.replace(/\D/g, ''),
        contact_name: newContactName.trim() || undefined
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
      await deleteConversation.mutateAsync({
        conversationId
      });
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      refetchConversations();
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
    }
  };
  const handleDeleteAllConversations = async () => {
    try {
      await deleteAllConversations.mutateAsync();
      setSelectedConversation(null);
      refetchConversations();
    } catch (error) {
      console.error('Erro ao deletar todas as conversas:', error);
    }
  };
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);
    if (diffInHours < 24) {
      return format(date, 'HH:mm', {
        locale: ptBR
      });
    } else if (diffInHours < 168) {
      // 7 dias
      return format(date, 'EEE HH:mm', {
        locale: ptBR
      });
    } else {
      return format(date, 'dd/MM HH:mm', {
        locale: ptBR
      });
    }
  };
  const getMessageStatus = (message: WhatsAppMessage) => {
    if (message.is_from_lead) return null;
    switch (message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };
  const renderMessageContent = (message: WhatsAppMessage) => {
    switch (message.message_type) {
      case 'audio':
        if (message.media_url) {
          return <AudioPlayer audioUrl={message.media_url} messageId={message.message_id} permanentUrl={message.permanent_audio_url} className="min-w-[200px]" />;
        }
        return <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <Mic className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">🎤 Mensagem de áudio</span>
          </div>;
      case 'image':
        return <div className="space-y-2">
            {message.media_url ? <img src={message.media_url} alt="Imagem" className="max-w-sm rounded-lg cursor-pointer hover:opacity-90" onClick={() => window.open(message.media_url, '_blank')} /> : <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <Camera className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">📷 Imagem</span>
              </div>}
            {message.message_text && message.message_text !== '📷 Imagem' && <p className="text-sm">{message.message_text}</p>}
          </div>;
      case 'document':
        return <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{message.attachment_name || 'Documento'}</p>
              {message.media_url && <Button size="sm" variant="outline" className="mt-1" onClick={() => window.open(message.media_url, '_blank')}>
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>}
            </div>
          </div>;
      default:
        return <p className="text-sm">{message.message_text}</p>;
    }
  };
  return <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-blue-600">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">WhatsApp Business</h2>
            <div className="flex items-center gap-2">
              {isConnected ? <Wifi className="w-4 h-4 text-green-200" /> : <WifiOff className="w-4 h-4 text-red-300" />}
              <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
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
                      <Input value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} placeholder="Ex: 5511999999999" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nome (opcional)</label>
                      <Input value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="Nome do contato" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateConversation} disabled={!newContactPhone.trim() || createConversation.isPending} className="flex-1">
                        Criar Conversa
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewContactDialog(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Botão para excluir todas as conversas */}
              {conversations.length > 0 && <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-red-300 hover:bg-red-500/20">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir todas as conversas</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja apagar TODAS as conversas e mensagens? 
                        Esta ação não pode ser desfeita e irá remover {conversations.length} conversa(s) permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllConversations} disabled={deleteAllConversations.isPending} className="bg-red-600 hover:bg-red-700">
                        {deleteAllConversations.isPending ? 'Excluindo...' : 'Excluir Todas'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>}
              
            </div>
          </div>
          
          {/* Barra de pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input type="text" placeholder="Pesquisar conversas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-white/50 border-white/30 focus:bg-white" />
          </div>
        </div>

        {/* Lista de Conversas */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100">
            {filteredConversations.map(conversation => <div key={conversation.id} className={`p-3 hover:bg-green-50 cursor-pointer transition-all duration-200 relative group rounded-lg mx-2 mb-1 ${selectedConversation?.id === conversation.id ? 'bg-gradient-to-r from-green-100 to-blue-100 border-l-4 border-green-500 shadow-md' : ''}`} onClick={() => setSelectedConversation(conversation)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Users className="w-5 h-5 text-white" />
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
                        {conversation.leads?.email && <Badge variant="secondary" className="mr-1 text-xs">
                            {conversation.leads.email}
                          </Badge>}
                        {conversation.phone_number}
                      </p>
                      
                      {!conversation.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                    </div>
                  </div>

                  {/* Botão de deletar */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" onClick={e => e.stopPropagation()}>
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
                        <AlertDialogAction onClick={() => handleDeleteConversation(conversation.id)} className="bg-red-600 hover:bg-red-700">
                          Apagar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>)}
          </div>
        </ScrollArea>
      </div>

      {/* Área Principal - Chat */}
      <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
        {selectedConversation ? <>
            {/* Header do Chat */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {selectedConversation.contact_name || selectedConversation.leads?.name || selectedConversation.phone_number}
                    </h3>
                    <p className="text-sm text-green-100">
                      {selectedConversation.leads?.email && `${selectedConversation.leads.email} • `}
                      {selectedConversation.phone_number}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 p-4 space-y-4 bg-gray-50">
              <div className="space-y-3">
                {messages.map(message => <div key={message.id} className={`flex ${message.is_from_lead ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-md px-3 py-2 rounded-lg ${message.is_from_lead ? 'bg-white text-gray-900' : 'bg-blue-500 text-white'}`}>
                      {renderMessageContent(message)}
                      
                      <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${message.is_from_lead ? 'text-gray-500' : 'text-blue-100'}`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {!message.is_from_lead && <span className="ml-1">{getMessageStatus(message)}</span>}
                      </div>
                    </div>
                  </div>)}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* WhatsApp Official Sender */}
            <WhatsAppOfficialSender phoneNumber={selectedConversation.phone_number} conversationId={selectedConversation.id} onMessageSent={() => {
          refetchMessages();
          refetchConversations();
        }} />

          </> : (/* Estado vazio */
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
          </div>)}
      </div>
    </div>;
}