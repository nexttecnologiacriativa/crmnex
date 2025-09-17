import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppConversations, useWhatsAppMessages } from '@/hooks/useWhatsApp';
import { useWhatsAppInstances, useSendWhatsAppMessage } from '@/hooks/useWhatsAppInstance';
import { useWorkspace } from '@/hooks/useWorkspace';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Send, Users, Wifi, WifiOff, Search } from 'lucide-react';

export default function EvolutionChat() {
  const { currentWorkspace } = useWorkspace();
  const { data: conversations = [] } = useWhatsAppConversations();
  const { data: instances = [] } = useWhatsAppInstances();
  const sendWhatsApp = useSendWhatsAppMessage();

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const selectedConv = conversations.find(c => c.id === selectedConvId) || null;
  const { data: messages = [] } = useWhatsAppMessages(selectedConvId || undefined);

  const connectedInstances = (instances || []).filter(i => i.status === 'open');
  const defaultInstance = connectedInstances[0]?.instance_name;

  const handleSend = async () => {
    if (!message.trim() || !selectedConv || !defaultInstance) return;
    const phoneDigits = (selectedConv.phone_number || '').replace(/\D/g, '');
    try {
      await sendWhatsApp.mutateAsync({
        instanceName: defaultInstance,
        phone: phoneDigits,
        message: message.trim(),
      });
      setMessage('');
    } catch (e) {
      // toast feedback já ocorre no hook
    }
  };

  const filteredConversations = conversations.filter((conv: any) =>
    (conv.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (conv.leads?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (conv.phone_number || '').includes(search)
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-blue-600">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">WhatsApp Evolution</h2>
            {connectedInstances.length > 0 ? (
              <Wifi className="w-4 h-4 text-green-200" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-300" />
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar conversas..."
              className="pl-10 bg-white/50 border-white/30 focus:bg-white"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv: any) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`p-3 hover:bg-green-50 cursor-pointer transition-all duration-200 relative group rounded-lg mx-2 mb-1 ${selectedConvId === conv.id ? 'bg-gradient-to-r from-green-100 to-blue-100 border-l-4 border-green-500 shadow-md' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conv.contact_name || conv.leads?.name || conv.phone_number}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {conv.leads?.email && (
                          <Badge variant="secondary" className="mr-1 text-xs">
                            {conv.leads.email}
                          </Badge>
                        )}
                        {conv.phone_number}
                      </p>
                      {!conv.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
        {selectedConv ? (
          <>
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">
                    {selectedConv.contact_name || selectedConv.leads?.name || selectedConv.phone_number}
                  </h3>
                  <p className="text-xs text-green-100">
                    Instância: {defaultInstance || 'Nenhuma conectada'}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((m: any) => (
                  <div key={m.id} className={`flex ${m.is_from_lead ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${m.is_from_lead ? 'bg-gray-100 text-gray-900' : 'bg-blue-600 text-white'}`}>
                      <p className="text-sm whitespace-pre-wrap">{m.message_text}</p>
                      <div className={`mt-2 text-[10px] ${m.is_from_lead ? 'text-gray-500' : 'text-blue-100'}`}>
                        {format(new Date(m.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-3 border-t bg-white">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="Digite uma mensagem"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button onClick={handleSend} disabled={!message.trim() || !defaultInstance} className="bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Selecione uma conversa</h3>
              <p className="text-gray-600">Escolha uma conversa na lista ao lado para começar a enviar e receber mensagens.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
