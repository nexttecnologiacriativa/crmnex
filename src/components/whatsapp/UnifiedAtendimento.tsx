import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppConversations, useWhatsAppMessages, useCreateConversation } from '@/hooks/useWhatsApp';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWhatsAppInstances, useSendWhatsAppMessage } from '@/hooks/useWhatsAppInstance';
import { useLeads } from '@/hooks/useLeads';
import { useLeadTagRelations } from '@/hooks/useLeadTags';
import { getLeadDisplayName } from '@/lib/leadUtils';
import { normalizeForMatch, ensureCountryCode55, phonesMatch } from '@/lib/phone';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Search, Send, Users, Wifi, WifiOff, Plus, UserSearch, Image as ImageIcon, Trash2, Download } from 'lucide-react';
import CreateLeadFromConversationDialog from '@/components/whatsapp/CreateLeadFromConversationDialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import AudioPlayer from '@/components/whatsapp/AudioPlayer';
import WhatsAppImage from '@/components/whatsapp/WhatsAppImage';
import ChatAudioSender from '@/components/whatsapp/ChatAudioSender';
import { useDeleteConversation } from '@/hooks/useWhatsApp';
import { useWhatsAppSyncStatus } from '@/hooks/useWhatsAppSync';
import { useClearAllConversations } from '@/hooks/useWhatsAppClear';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Audio functionality has been removed from this component
export default function UnifiedAtendimento() {
  const {
    currentWorkspace
  } = useWorkspace();
  const {
    data: conversations = [],
    refetch: refetchConversations
  } = useWhatsAppConversations();
  const {
    data: instances = []
  } = useWhatsAppInstances();
  // const { data: syncStatuses } = useWhatsAppSyncStatus(); // Temporarily disabled to stop polling
  const sendEvolution = useSendWhatsAppMessage();
  const createConversation = useCreateConversation();
  const {
    data: leads = []
  } = useLeads();
  const queryClient = useQueryClient();

  // State declarations first
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  // Controlled initialization - runs only once
  const hasInitialized = useRef(false);
  useEffect(() => {
    // Only run once per workspace change
    if (hasInitialized.current || !currentWorkspace?.id) return;
    console.log('🔄 Inicializando dados do workspace:', currentWorkspace.id);

    // Mark as initialized for this workspace
    hasInitialized.current = true;

    // Only invalidate specific queries instead of clearing entire cache
    queryClient.invalidateQueries({
      queryKey: ['whatsapp-conversations', currentWorkspace.id]
    });
    queryClient.invalidateQueries({
      queryKey: ['whatsapp-messages']
    });

    // Debug auth context once
    supabase.rpc('debug_auth_context').then(result => {
      console.log('🔍 Auth context debug:', result.data);
    }, err => {
      console.error('❌ Auth context debug error:', err);
    });
  }, [currentWorkspace?.id, queryClient]);

  // Reset initialization flag when workspace changes
  useEffect(() => {
    hasInitialized.current = false;
  }, [currentWorkspace?.id]);

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    queryClient.invalidateQueries({
      queryKey: ['whatsapp-conversations', currentWorkspace?.id]
    });
    queryClient.invalidateQueries({
      queryKey: ['whatsapp-messages']
    });
    refetchConversations();
    toast.success('Dados atualizados!');
  };

  // Track unread conversations with new messages since user last opened them
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set());

  // Create lead dialog state
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [selectedConvForLead, setSelectedConvForLead] = useState<any>(null);

  // Prevent processing navigation state more than once
  const hasProcessedNavRef = useRef(false);
  const location = useLocation();

  // Função para encontrar lead por telefone usando normalização avançada
  const findLeadByPhone = (phone: string) => {
    if (!phone || !leads?.length) return null;

    // const normalizedPhone = normalizeForMatch(phone);
    return leads.find(lead => {
      if (!lead.phone) return false;
      return phonesMatch(lead.phone, phone);
    });
  };
  useEffect(() => {
    if (hasProcessedNavRef.current) return;

    // Verificar se veio de um lead específico
    if (location.state?.leadId && location.state?.phone && conversations.length > 0) {
      const leadId = location.state.leadId;
      const phone = location.state.phone;
      const normalizedPhone = normalizeForMatch(phone);

      // Buscar o lead nos dados
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        // Procurar se já existe uma conversa com esse telefone (comparando versões normalizadas)
        const existingConv = conversations.find(c => phonesMatch(c.phone_number || '', phone));
        if (existingConv) {
          // Se já existe conversa, selecionar diretamente
          setSelectedConvId(existingConv.id);
        } else {
          // Se não existe, criar nova conversa automaticamente
          handleCreateConversationForLead(leadId, normalizedPhone, lead);
        }

        // Limpar o state para não ficar persistente e marcar como processado
        hasProcessedNavRef.current = true;
        if (window.history.replaceState) {
          window.history.replaceState(null, '', location.pathname);
        }
      }
      return; // Evita executar o código do outbound se já processou lead
    }

    // Verificar se veio do Outbound
    if (location.state?.source === 'outbound' && location.state?.companyName && conversations.length > 0) {
      const {
        companyName,
        companyPhone
      } = location.state;
      if (companyPhone) {
        const normalizedPhone = normalizeForMatch(companyPhone);

        // Procurar se já existe uma conversa com esse telefone
        const existingConv = conversations.find(c => phonesMatch(c.phone_number || '', companyPhone));
        if (existingConv) {
          // Se já existe conversa, selecionar diretamente
          setSelectedConvId(existingConv.id);
        } else {
          // Se não existe, criar nova conversa automaticamente
          handleCreateConversationForCompany(companyName, normalizedPhone);
        }
      } else {
        // Se não tem telefone, só criar conversa com nome
        handleCreateConversationForCompany(companyName, '');
      }

      // Limpar o state imediatamente para evitar execuções duplas e marcar como processado
      hasProcessedNavRef.current = true;
      window.history.replaceState(null, '', location.pathname);
    }
  }, [location.state, leads, conversations]);
  const handleCreateConversationForLead = async (leadId: string, phoneDigits: string, lead: any) => {
    if (!currentWorkspace?.id) return;
    try {
      const created = await createConversation.mutateAsync({
        workspace_id: currentWorkspace.id,
        phone_number: phoneDigits,
        contact_name: getLeadDisplayName(lead),
        lead_id: leadId
      });

      // Selecionar a nova conversa
      setSelectedConvId(created.id);

      // Atualizar a lista de conversas
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace.id]
      });
      toast.success('Conversa iniciada com o lead');
    } catch (e: any) {
      toast.error('Erro ao iniciar conversa: ' + (e?.message || 'Erro desconhecido'));
    }
  };
  const handleCreateConversationForCompany = async (companyName: string, phoneDigits: string) => {
    if (!currentWorkspace?.id) return;
    try {
      const created = await createConversation.mutateAsync({
        workspace_id: currentWorkspace.id,
        phone_number: phoneDigits,
        contact_name: companyName,
        lead_id: null
      });

      // Selecionar a nova conversa
      setSelectedConvId(created.id);

      // Atualizar a lista de conversas
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace.id]
      });
      toast.success(`Conversa iniciada com ${companyName}`);
    } catch (e: any) {
      toast.error('Erro ao iniciar conversa: ' + (e?.message || 'Erro desconhecido'));
    }
  };

  // Instance selection
  const connectedInstances = (instances || []).filter(i => i.status === 'open');
  const firstInstance = connectedInstances[0]?.instance_name || '';
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>(firstInstance);

  // New message dialog state
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newMsgPhone, setNewMsgPhone] = useState('');
  const [newMsgText, setNewMsgText] = useState('');
  const [newMsgInstanceName, setNewMsgInstanceName] = useState<string>(firstInstance);
  const deleteConversation = useDeleteConversation();
  const clearAllConversations = useClearAllConversations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Scroll automático para última mensagem
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConv = useMemo(() => conversations.find(c => c.id === selectedConvId) || null, [conversations, selectedConvId]);
  const {
    data: messages = []
  } = useWhatsAppMessages(selectedConvId || '');

  // Debug effect for conversations and messages (added after variable declarations)
  useEffect(() => {
    console.log('📊 Conversations updated:', {
      count: conversations.length,
      conversations: conversations.map(c => ({
        id: c.id,
        phone: c.phone_number,
        name: c.contact_name,
        messageCount: c.message_count
      }))
    });
  }, [conversations]);
  useEffect(() => {
    if (selectedConvId && messages.length >= 0) {
      console.log('💬 Messages updated for conversation:', selectedConvId, {
        count: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          type: m.message_type,
          text: m.message_text?.substring(0, 50) + '...',
          timestamp: m.timestamp
        }))
      });
    }
  }, [messages, selectedConvId]);

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  // Scroll automático quando mensagens mudarem
  useEffect(() => {
    if (messages.length > 0) {
      // Delay para garantir que DOM foi atualizado
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);

  // Remover polling automático para economizar créditos
  // Atualizações serão feitas apenas via realtime e ações do usuário

  // Realtime disabled to prevent auto-refresh issues
  // useEffect(() => {
  //   if (!selectedConvId || !currentWorkspace?.id) return;
  //   console.log('Realtime messages disabled to prevent auto-refresh');
  // }, [selectedConvId, currentWorkspace?.id, queryClient]);

  // Realtime disabled to prevent auto-refresh issues
  // useEffect(() => {
  //   if (!currentWorkspace?.id) return;
  //   console.log('Realtime conversations disabled to prevent auto-refresh');
  // }, [currentWorkspace?.id, queryClient]);

  const handleSend = async () => {
    if (!message.trim() || !selectedConv || !selectedInstanceName) {
      if (!selectedInstanceName) toast.error('Selecione uma instância Evolution');
      return;
    }
    const phoneToSend = ensureCountryCode55(selectedConv.phone_number || '');
    try {
      await sendEvolution.mutateAsync({
        instanceName: selectedInstanceName,
        phone: phoneToSend,
        message: message.trim(),
        workspaceId: currentWorkspace?.id
      });
      setMessage('');
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-messages', selectedConv.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace?.id]
      });
      // Auto-scroll após enviar mensagem
      setTimeout(scrollToBottom, 200);
    } catch (e) {
      // feedback nos hooks
    }
  };
  const handleImageSelect = async (file: File) => {
    if (!selectedConv || !selectedInstanceName) {
      if (!selectedInstanceName) toast.error('Selecione uma instância Evolution');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    try {
      setIsUploadingImage(true);
      const fileName = `${Date.now()}_${file.name}`;
      const path = `uploads/${fileName}`;
      const {
        data: up,
        error: upErr
      } = await supabase.storage.from('whatsapp-images').upload(path, file, {
        contentType: file.type
      });
      if (upErr) throw upErr;
      const {
        data: pub
      } = supabase.storage.from('whatsapp-images').getPublicUrl(up.path);
      const phoneToSend = ensureCountryCode55(selectedConv.phone_number || '');
      // Evolution API config (optional)
      const cfgRaw = currentWorkspace?.id ? localStorage.getItem(`evolution_config_${currentWorkspace.id}`) : null;
      const cfg = cfgRaw ? JSON.parse(cfgRaw) : null;
      await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'send_image',
          instanceName: selectedInstanceName,
          phone: phoneToSend,
          imageUrl: pub.publicUrl,
          caption: message?.trim() || undefined,
          workspaceId: currentWorkspace?.id,
          apiKey: cfg?.global_api_key,
          apiUrl: cfg?.apiUrl
        }
      });
      setMessage('');
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-messages', selectedConv.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace?.id]
      });
      setTimeout(scrollToBottom, 200);
      toast.success('Imagem enviada com sucesso!');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar imagem');
    } finally {
      setIsUploadingImage(false);
    }
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    e.currentTarget.value = '';
  };

  // Enriquecer conversas com dados de leads e nome de exibição
  const enrichedConversations = conversations.map((conv: any) => {
    const foundLead = findLeadByPhone(conv.phone_number || '');
    return {
      ...conv,
      leads: foundLead,
      displayName: foundLead ? getLeadDisplayName(foundLead) : conv.contact_name || conv.phone_number || 'Contato'
    };
  });

  // Filters and helpers
  const filteredConversations = enrichedConversations.filter((conv: any) => {
    const searchLower = search.toLowerCase();
    const normalizedConvPhone = normalizeForMatch(conv.phone_number || '');
    return conv.displayName.toLowerCase().includes(searchLower) || (conv.phone_number || '').includes(search) || normalizedConvPhone.includes(search.replace(/\D/g, ''));
  });
  const formatTime = (iso?: string) => iso ? format(new Date(iso), 'HH:mm', {
    locale: ptBR
  }) : '';

  // Leads search

  const filteredLeads = leads.filter((l: any) => {
    const needle = leadSearch.toLowerCase();
    return (l.name || '').toLowerCase().includes(needle) || (l.email || '').toLowerCase().includes(needle) || (l.phone || '').toString().includes(leadSearch);
  });
  const selectedLead = selectedLeadId ? leads.find((l: any) => l.id === selectedLeadId) : null;
  useEffect(() => {
    if (selectedLead) setNewMsgPhone(selectedLead.phone || '');
  }, [selectedLead]);
  const handleCreateAndSend = async () => {
    if (!currentWorkspace?.id) return;
    const phoneRaw = newMsgPhone.trim();
    if (!phoneRaw || !newMsgText.trim()) {
      toast.error('Informe telefone e mensagem');
      return;
    }
    const phoneToSend = ensureCountryCode55(phoneRaw);
    try {
      // Find or create conversation
      let convo = conversations.find((c: any) => phonesMatch(c.phone_number || '', phoneRaw));
      if (!convo) {
        const created = await createConversation.mutateAsync({
          workspace_id: currentWorkspace.id,
          phone_number: phoneToSend,
          contact_name: selectedLead ? getLeadDisplayName(selectedLead) : undefined,
          lead_id: selectedLead?.id || undefined
        });
        convo = created;
      }

      // Send through Evolution API
      if (!newMsgInstanceName) {
        toast.error('Selecione uma instância Evolution');
        return;
      }
      await sendEvolution.mutateAsync({
        instanceName: newMsgInstanceName,
        phone: phoneToSend,
        message: newMsgText.trim(),
        workspaceId: currentWorkspace.id
      });

      // Atualiza histórico
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-messages', convo.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace.id]
      });
      toast.success('Mensagem enviada');
      setNewMsgOpen(false);
      setSelectedConvId(convo.id);
      setNewMsgText('');
      setSelectedLeadId(null);
      setLeadSearch('');
    } catch (e: any) {
      if (e?.message) toast.error(e.message);
    }
  };
  return <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Atendimento
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => setNewMsgOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="h-4 w-4 mr-2" /> Nova conversa
            </Button>
          {/* Botão de limpar todas as conversas removido para evitar duplicidade com Apagar */}
            {selectedConv && <Button variant="outline" size="sm" onClick={() => {
            if (confirm('Apagar esta conversa e todas as mensagens?')) {
              deleteConversation.mutate({
                conversationId: selectedConv.id
              });
              setSelectedConvId(null);
            }
          }}>
                <Trash2 className="h-4 w-4 mr-2" /> Apagar
              </Button>}
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleManualRefresh}>
              🔄
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[calc(100vh-260px)] bg-background rounded-b-lg overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r flex flex-col">
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Conversas</h2>
                <div className="flex items-center gap-2">
                  {connectedInstances.length > 0 ? <Wifi className="w-4 h-4 text-primary" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                  {/* Temporarily disabled sync status badge 
                   {syncStatuses && syncStatuses.length > 0 && (
                    <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      {syncStatuses[0]?.total_messages || 0} msgs sync
                    </Badge>
                   )}
                   */}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar conversas..." className="pl-10" />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y">
                  {filteredConversations.map((conv: any) => {
                const hasNewMessages = unreadConversations.has(conv.id);
                return <button key={conv.id} onClick={() => {
                  setSelectedConvId(conv.id);
                  // Remove from unread when user opens the conversation
                  setUnreadConversations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(conv.id);
                    return newSet;
                  });
                }} className={`w-full text-left p-3 hover:bg-accent transition-colors relative ${selectedConvId === conv.id ? 'bg-accent' : hasNewMessages ? 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">
                            {conv.displayName}
                          </h3>
                          <span className="text-xs text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <LeadTagsDisplay leadId={conv.leads?.id} />
                            {!conv.leads && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={e => {
                            e.stopPropagation();
                            setSelectedConvForLead({
                              ...conv,
                              contact_name: conv.contact_name || conv.phone_number
                            });
                            setCreateLeadOpen(true);
                          }} title="Criar lead para este contato">
                                <Plus className="h-3 w-3" />
                              </Button>}
                            <span className="text-xs text-muted-foreground truncate">{conv.phone_number}</span>
                          </div>
                          {!conv.is_read && <div className="w-2 h-2 bg-primary rounded-full" />}
                        </div>
                      </div>
                    </div>
                      </button>;
              })}
               </div>
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {selectedConv ? <>
                <div className="border-b p-4 bg-card">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">
                        {(() => {
                      const lead = findLeadByPhone(selectedConv.phone_number || '');
                      return lead ? getLeadDisplayName(lead) : selectedConv.contact_name || selectedConv.phone_number || 'Contato';
                    })()}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedConv.phone_number}
                      </p>
                    </div>
                    {/* Instance picker */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Instância</Label>
                        <Select value={selectedInstanceName} onValueChange={setSelectedInstanceName}>
                          <SelectTrigger className="w-[200px] h-8">
                            <SelectValue placeholder="Selecione a instância" />
                          </SelectTrigger>
                          <SelectContent>
                            {connectedInstances.map((i: any) => <SelectItem key={i.instance_name} value={i.instance_name}>
                                {i.instance_name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((m: any) => <div key={m.id} className={`flex ${m.is_from_lead ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-xl px-4 py-3 shadow-sm ${m.is_from_lead ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'}`}>
                          
                          {/* Image Message */}
                          {m.message_type === 'image' && m.media_url ? <div className="mb-2">
                              <WhatsAppImage mediaUrl={m.media_url} alt="Imagem enviada" className="max-w-48 rounded-lg" />
                            </div> : null}
                          
                          {/* Audio Message Simplified */}
                          {m.message_type === 'audio' ? <div className="mb-2 space-y-2">
                              {/* Use simple HTML5 audio if we have permanent URL */}
                              {m.permanent_audio_url ? <div className="space-y-1">
                                  <audio controls className="w-full max-w-xs" src={m.permanent_audio_url} preload="metadata">
                                    Seu navegador não suporta o elemento de áudio.
                                  </audio>
                                  <div className="text-xs text-green-400">✅ Áudio processado</div>
                                </div> : <div className="space-y-1">
                                  
                                </div>}
                              
                              {/* Debug Links */}
                              
                            </div> : null}
                          
                          <p className="text-sm whitespace-pre-wrap">{m.message_text}</p>
                          <div className={`mt-2 text-[10px] ${m.is_from_lead ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                            {m.timestamp ? format(new Date(m.timestamp), 'dd/MM HH:mm', {
                        locale: ptBR
                      }) : ''}
                          </div>
                        </div>
                      </div>)}
                     {/* Referência para scroll automático */}
                     <div ref={messagesEndRef} />
                   </div>
                 </ScrollArea>

                <div className="border-t p-4 bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <ChatAudioSender selectedConv={selectedConv} selectedInstanceName={selectedInstanceName} currentWorkspace={currentWorkspace} onAudioSent={() => {
                  queryClient.invalidateQueries({
                    queryKey: ['whatsapp-messages', selectedConv?.id]
                  });
                  queryClient.invalidateQueries({
                    queryKey: ['whatsapp-conversations', currentWorkspace?.id]
                  });
                  setTimeout(() => messagesEndRef.current?.scrollIntoView({
                    behavior: 'smooth'
                  }), 200);
                }} />
                  </div>
                  
                   <div className="flex items-end gap-2">
                     <Textarea placeholder="Digite uma mensagem..." value={message} onChange={e => setMessage(e.target.value)} className="flex-1 resize-none" onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }} />
                     <div className="flex gap-1">
                       <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={!selectedInstanceName}>
                         <ImageIcon className="h-4 w-4" />
                       </Button>
                       <Button onClick={handleSend} size="sm" disabled={!message.trim() || !selectedInstanceName}>
                         <Send className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>

                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
                </div>
              </> : <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
                  <p className="text-muted-foreground">Escolha uma conversa na lista ao lado para começar a enviar e receber mensagens.</p>
                </div>
              </div>}
          </div>
        </div>
      </CardContent>

      {/* Dialog Nova Mensagem */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5 text-primary" />
              Nova mensagem
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Buscar lead</Label>
              <Input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Nome, e-mail ou telefone" />
              {leadSearch.length > 1 && <div className="mt-2 max-h-40 overflow-auto rounded-md border">
                  {filteredLeads.length === 0 ? <div className="p-3 text-sm text-muted-foreground">Nenhum lead encontrado</div> : filteredLeads.slice(0, 20).map((l: any) => <button key={l.id} type="button" onClick={() => {
                setSelectedLeadId(l.id);
                setLeadSearch(getLeadDisplayName(l));
              }} className={`w-full text-left p-3 hover:bg-accent ${selectedLeadId === l.id ? 'bg-accent' : ''}`}>
                        <div className="font-medium">{getLeadDisplayName(l)}</div>
                        <div className="text-xs text-muted-foreground">{l.phone || 'Sem telefone'} {l.company ? `• ${l.company}` : ''}</div>
                      </button>)}
                </div>}
            </div>

            <div>
              <Label>Telefone</Label>
              <Input value={newMsgPhone} onChange={e => setNewMsgPhone(e.target.value)} placeholder="Ex: 5511999999999" />
            </div>

            {connectedInstances.length > 0 && <div className="mb-4">
                <Label>Instância</Label>
                <Select value={newMsgInstanceName} onValueChange={setNewMsgInstanceName}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a instância" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedInstances.map((i: any) => <SelectItem key={i.instance_name} value={i.instance_name}>
                        {i.instance_name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            <div>
              <Label>Mensagem</Label>
              <Textarea value={newMsgText} onChange={e => setNewMsgText(e.target.value)} placeholder="Digite sua mensagem" className="min-h-[90px]" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMsgOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAndSend} disabled={!newMsgPhone.trim() || !newMsgText.trim() || !newMsgInstanceName} className="w-full">
              <Send className="h-4 w-4 mr-2" /> Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Lead */}
      <CreateLeadFromConversationDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} phoneNumber={selectedConvForLead?.phone_number || ''} contactName={selectedConvForLead?.contact_name} conversationId={selectedConvForLead?.id || ''} onLeadCreated={leadId => {
      // Refresh conversations to update the UI
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['leads']
      });
      toast.success('Lead criado com sucesso!');
    }} />
    </Card>;
}

// Component to display lead tags
function LeadTagsDisplay({
  leadId
}: {
  leadId?: string;
}) {
  const {
    data: tagRelations = []
  } = useLeadTagRelations(leadId || '');
  if (!leadId || tagRelations.length === 0) {
    return null;
  }
  return <div className="flex flex-wrap gap-1">
      {tagRelations.slice(0, 2).map((relation: any) => <Badge key={relation.id} variant="outline" className="text-xs" style={{
      borderColor: relation.lead_tags?.color || '#3b82f6',
      color: relation.lead_tags?.color || '#3b82f6'
    }}>
          {relation.lead_tags?.name}
        </Badge>)}
      {tagRelations.length > 2 && <Badge variant="outline" className="text-xs">
          +{tagRelations.length - 2}
        </Badge>}
    </div>;
}