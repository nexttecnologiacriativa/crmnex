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
import { MessageCircle, Search, Send, Users, Wifi, WifiOff, Plus, UserSearch, UserPlus, Image as ImageIcon, Trash2, Download, AlertCircle, Video, FileText, Eye, User, Copy } from 'lucide-react';
import CreateLeadFromConversationDialog from '@/components/whatsapp/CreateLeadFromConversationDialog';
import ConversationCard from '@/components/whatsapp/ConversationCard';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import AudioPlayer from '@/components/whatsapp/AudioPlayer';
import WhatsAppImage from '@/components/whatsapp/WhatsAppImage';
import WhatsAppVideo from '@/components/whatsapp/WhatsAppVideo';
import ChatAudioSender from '@/components/whatsapp/ChatAudioSender';
import { useDeleteConversation } from '@/hooks/useWhatsApp';
import { useWhatsAppSyncStatus } from '@/hooks/useWhatsAppSync';
import { useClearAllConversations } from '@/hooks/useWhatsAppClear';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';

// Audio functionality has been removed from this component
// Image size limit: 5MB (to ensure compatibility with WhatsApp/Evolution API)
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024; // 5MB in bytes
const MAX_IMAGE_DIMENSION = 1280; // Optimized for mobile - keeps base64 under 1MB nginx limit
const MAX_COMPRESSED_SIZE = 500 * 1024; // 500KB target to ensure base64 stays under 1MB

// Video and document size limits
const MAX_VIDEO_SIZE_MB = 16;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const MAX_DOCUMENT_SIZE_MB = 16;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

// Accepted file types
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/3gpp', 'video/quicktime'];
const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];

// Sanitize filename to remove emojis and special characters
const sanitizeFileName = (fileName: string): string => {
  // Remove emojis
  const withoutEmoji = fileName.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]/gu, '');

  // Remove non-ASCII characters and replace spaces with underscore
  return withoutEmoji.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
  .replace(/[^\w\s.-]/g, '') // Remove special characters (except . - _)
  .replace(/\s+/g, '_') // Replace spaces with underscore
  .replace(/_+/g, '_') // Remove duplicate underscores
  .trim();
};

// Compress and resize image using Canvas API
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let {
        width,
        height
      } = img;
      const originalDimensions = `${width}x${height}`;

      // Check if resize is needed
      const needsResize = width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION;
      if (needsResize) {
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          height = Math.round(height * MAX_IMAGE_DIMENSION / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round(width * MAX_IMAGE_DIMENSION / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao criar contexto do canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with 70% quality (more aggressive compression)
      canvas.toBlob(blob => {
        if (blob) {
          const newName = file.name.replace(/\.[^.]+$/, '.jpg');
          const compressedFile = new File([blob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          console.log(`📸 Imagem processada: ${originalDimensions} → ${width}x${height}, ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
          resolve(compressedFile);
        } else {
          reject(new Error('Falha ao comprimir imagem'));
        }
      }, 'image/jpeg', 0.7 // 70% quality for smaller size
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Falha ao carregar imagem'));
    };
    img.src = URL.createObjectURL(file);
  });
};
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
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);

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
  // CRITICAL: Esta função garante que números com formatos diferentes sejam encontrados
  const findLeadByPhone = (phone: string) => {
    if (!phone || !leads?.length) return null;

    // Buscar lead usando phonesMatch que trata sufixos e DDI
    return leads.find(lead => {
      if (!lead.phone) return false;
      return phonesMatch(lead.phone, phone);
    });
  };

  // Buscar perfis dos responsáveis (assigned_to) dos leads
  const {
    data: profiles = []
  } = useQuery({
    queryKey: ['profiles-for-leads', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !leads?.length) return [];
      const assigneeIds = leads.map(l => l.assigned_to).filter(Boolean) as string[];
      if (assigneeIds.length === 0) return [];
      const {
        data,
        error
      } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', assigneeIds);
      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentWorkspace?.id && !!leads?.length
  });

// Instance selection - DEVE VIR ANTES DOS useEffect QUE USAM ESTAS VARIÁVEIS
  const connectedInstances = (instances || []).filter(i => i.status === 'open');
  const firstInstance = connectedInstances[0]?.instance_name || '';
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>(firstInstance);
  
  // Instance filter for conversations
  const [instanceFilter, setInstanceFilter] = useState<string>('all');
  
  // Helper to get instance display name
  const getInstanceDisplayName = (instanceName: string) => {
    const instance = instances.find(i => i.instance_name === instanceName);
    return instance?.display_name || instanceName.replace(/^ws_\w+_/, '');
  };

  // Helper to get instance_name from conversation's instance_id
  const getInstanceNameFromConversation = (conversation: any) => {
    if (!conversation?.instance_id) return null;
    const instance = instances.find((i: any) => i.id === conversation.instance_id);
    return instance?.instance_name || null;
  };

  // Auto-select first connected instance when available
  useEffect(() => {
    if (!selectedInstanceName && firstInstance) {
      console.log('🔌 Auto-selecionando primeira instância conectada:', firstInstance);
      setSelectedInstanceName(firstInstance);
    }
  }, [firstInstance, selectedInstanceName]);
  useEffect(() => {
    if (hasProcessedNavRef.current) return;

    // Verificar se veio de um lead específico
    if (location.state?.leadId && location.state?.phone && conversations.length > 0) {
      const leadId = location.state.leadId;
      const phone = location.state.phone;
      const normalizedPhone = normalizeForMatch(phone);

      // Garantir que uma instância está selecionada
      if (!selectedInstanceName && firstInstance) {
        console.log('🔌 Selecionando instância automaticamente ao abrir conversa de lead:', firstInstance);
        setSelectedInstanceName(firstInstance);
      }

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

      // Garantir que uma instância está selecionada
      if (!selectedInstanceName && firstInstance) {
        console.log('🔌 Selecionando instância automaticamente ao abrir conversa de outbound:', firstInstance);
        setSelectedInstanceName(firstInstance);
      }
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
  }, [location.state, leads, conversations, selectedInstanceName, firstInstance]);
  const handleCreateConversationForLead = async (leadId: string, phoneDigits: string, lead: any) => {
    if (!currentWorkspace?.id) return;

    // Garantir que uma instância está selecionada
    if (!selectedInstanceName && firstInstance) {
      console.log('🔌 Selecionando instância automaticamente para lead:', firstInstance);
      setSelectedInstanceName(firstInstance);
    }
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

    // Garantir que uma instância está selecionada
    if (!selectedInstanceName && firstInstance) {
      console.log('🔌 Selecionando instância automaticamente para empresa:', firstInstance);
      setSelectedInstanceName(firstInstance);
    }
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
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [imageSizeError, setImageSizeError] = useState<{
    open: boolean;
    fileName: string;
    fileSize: number;
    maxSize: number;
  } | null>(null);
  const [fileSizeError, setFileSizeError] = useState<{
    open: boolean;
    fileName: string;
    fileSize: number;
    maxSize: number;
    fileType: 'video' | 'document';
  } | null>(null);

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
    if (!message.trim() || !selectedConv || !selectedInstanceName || isSendingMessage) {
      if (!selectedInstanceName) toast.error('Selecione uma instância Evolution');
      return;
    }

    // Prevenir cliques rápidos (cooldown de 1s)
    const now = Date.now();
    if (now - lastSentAt < 1000) {
      toast.error('Aguarde um momento antes de enviar outra mensagem');
      return;
    }
    setIsSendingMessage(true); // Trava imediata
    const phoneToSend = ensureCountryCode55(selectedConv.phone_number || '');
    try {
      await sendEvolution.mutateAsync({
        instanceName: selectedInstanceName,
        phone: phoneToSend,
        message: message.trim(),
        workspaceId: currentWorkspace?.id
      });
      setMessage('');
      setLastSentAt(Date.now()); // Registrar timestamp
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
    } finally {
      setIsSendingMessage(false); // Libera após conclusão
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

      // Always compress/resize images larger than 500KB to ensure base64 < 1MB
      let fileToUpload = file;
      const needsCompression = file.size > MAX_COMPRESSED_SIZE; // Compress if > 500KB

      if (needsCompression) {
        toast.info('Otimizando imagem...');
        try {
          fileToUpload = await compressImage(file);

          // If still above target, recompress with lower quality
          if (fileToUpload.size > MAX_COMPRESSED_SIZE) {
            console.log(`⚠️ Imagem ainda grande (${(fileToUpload.size / 1024).toFixed(0)}KB), recomprimindo com qualidade 50%...`);
            toast.info('Aplicando compressão adicional...');

            // Recompress with 50% quality
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = URL.createObjectURL(fileToUpload);
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const blob = await new Promise<Blob | null>(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.5); // 50% quality
              });
              if (blob) {
                fileToUpload = new File([blob], fileToUpload.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                console.log(`✅ Recompressão concluída: ${(blob.size / 1024).toFixed(0)}KB`);
              }
            }
            URL.revokeObjectURL(img.src);
          }

          // If STILL too large after recompression
          if (fileToUpload.size > MAX_IMAGE_SIZE_BYTES) {
            setImageSizeError({
              open: true,
              fileName: file.name,
              fileSize: fileToUpload.size,
              maxSize: MAX_IMAGE_SIZE_BYTES
            });
            return;
          }
          toast.success(`Imagem otimizada: ${(fileToUpload.size / 1024).toFixed(0)}KB`);
        } catch (compressError) {
          console.error('Erro ao comprimir:', compressError);
          // If compression fails but original file is small enough, try to send
          if (file.size > MAX_IMAGE_SIZE_BYTES) {
            setImageSizeError({
              open: true,
              fileName: file.name,
              fileSize: file.size,
              maxSize: MAX_IMAGE_SIZE_BYTES
            });
            return;
          }
        }
      }
      toast.info('Enviando imagem...');
      const fileName = `${Date.now()}_${file.name}`;
      const path = `${currentWorkspace?.id}/images/${fileName}`;

      // Upload to correct bucket: whatsapp-media using optimized file
      const {
        data: up,
        error: upErr
      } = await supabase.storage.from('whatsapp-media').upload(path, fileToUpload, {
        contentType: file.type,
        cacheControl: '3600'
      });
      if (upErr) {
        console.error('Upload error:', upErr);
        throw new Error(`Erro ao fazer upload da imagem: ${upErr.message}`);
      }
      const {
        data: pub
      } = supabase.storage.from('whatsapp-media').getPublicUrl(up.path);
      const phoneToSend = ensureCountryCode55(selectedConv.phone_number || '');

      // Evolution API config
      const cfgRaw = currentWorkspace?.id ? localStorage.getItem(`evolution_config_${currentWorkspace.id}`) : null;
      const cfg = cfgRaw ? JSON.parse(cfgRaw) : null;

      // Send image via Evolution API using direct URL (avoid 413 error with Base64)
      const {
        data: sendResult,
        error: sendError
      } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'sendMediaUrl',
          instanceName: selectedInstanceName,
          number: phoneToSend,
          mediaUrl: pub.publicUrl,
          mediaType: 'image',
          fileName: fileName,
          caption: message?.trim() || '',
          workspaceId: currentWorkspace?.id,
          apiKey: cfg?.global_api_key,
          apiUrl: cfg?.api_url
        }
      });
      if (sendError) {
        console.error('Send error:', sendError);
        throw new Error(`Erro ao enviar imagem: ${sendError.message}`);
      }
      if (!sendResult || sendResult.error) {
        throw new Error(sendResult?.error || 'Falha ao enviar imagem');
      }
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
      console.error('Image send error:', e);
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
  const handleVideoSelect = async (file: File) => {
    if (!selectedConv || !selectedInstanceName) {
      if (!selectedInstanceName) toast.error('Selecione uma instância Evolution');
      return;
    }

    // Validate video type
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Formato de vídeo não suportado. Use MP4, MOV ou 3GPP.');
      return;
    }

    // Validate size
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setFileSizeError({
        open: true,
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_VIDEO_SIZE_BYTES,
        fileType: 'video'
      });
      return;
    }
    try {
      setIsUploadingVideo(true);
      toast.info('Enviando vídeo...');

      // Upload to Supabase Storage with sanitized filename
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}_${sanitizedName}`;
      const path = `${currentWorkspace?.id}/videos/${fileName}`;
      const {
        data: up,
        error: upErr
      } = await supabase.storage.from('whatsapp-media').upload(path, file, {
        contentType: file.type,
        cacheControl: '3600'
      });
      if (upErr) throw new Error(`Erro ao fazer upload: ${upErr.message}`);
      const {
        data: pub
      } = supabase.storage.from('whatsapp-media').getPublicUrl(up.path);
      const phoneToSend = ensureCountryCode55(selectedConv.phone_number || '');

      // Send via Evolution API
      const {
        data: sendResult,
        error: sendError
      } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'sendMediaUrl',
          instanceName: selectedInstanceName,
          number: phoneToSend,
          mediaUrl: pub.publicUrl,
          mediaType: 'video',
          fileName: fileName,
          caption: message?.trim() || '',
          workspaceId: currentWorkspace?.id
        }
      });
      if (sendError || sendResult?.error) {
        throw new Error(sendResult?.error || sendError?.message || 'Falha ao enviar vídeo');
      }
      setMessage('');
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-messages', selectedConv.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace?.id]
      });
      setTimeout(scrollToBottom, 200);
      toast.success('Vídeo enviado com sucesso!');
    } catch (e: any) {
      console.error('Video send error:', e);
      toast.error(e?.message || 'Falha ao enviar vídeo');
    } finally {
      setIsUploadingVideo(false);
    }
  };
  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoSelect(file);
    e.currentTarget.value = '';
  };
  const handleDocumentSelect = async (file: File) => {
    if (!selectedConv || !selectedInstanceName) {
      if (!selectedInstanceName) toast.error('Selecione uma instância Evolution');
      return;
    }

    // Validate size
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setFileSizeError({
        open: true,
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_DOCUMENT_SIZE_BYTES,
        fileType: 'document'
      });
      return;
    }
    try {
      setIsUploadingDocument(true);
      toast.info('Enviando documento...');

      // Upload to Supabase Storage with sanitized filename
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}_${sanitizedName}`;
      const path = `${currentWorkspace?.id}/documents/${fileName}`;
      const {
        data: up,
        error: upErr
      } = await supabase.storage.from('whatsapp-media').upload(path, file, {
        contentType: file.type,
        cacheControl: '3600'
      });
      if (upErr) throw new Error(`Erro ao fazer upload: ${upErr.message}`);
      const {
        data: pub
      } = supabase.storage.from('whatsapp-media').getPublicUrl(up.path);
      const phoneToSend = ensureCountryCode55(selectedConv.phone_number || '');

      // Send via Evolution API
      const {
        data: sendResult,
        error: sendError
      } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'sendMediaUrl',
          instanceName: selectedInstanceName,
          number: phoneToSend,
          mediaUrl: pub.publicUrl,
          mediaType: 'document',
          fileName: file.name,
          // Keep original name for documents
          caption: message?.trim() || '',
          workspaceId: currentWorkspace?.id
        }
      });
      if (sendError || sendResult?.error) {
        throw new Error(sendResult?.error || sendError?.message || 'Falha ao enviar documento');
      }
      setMessage('');
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-messages', selectedConv.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-conversations', currentWorkspace?.id]
      });
      setTimeout(scrollToBottom, 200);
      toast.success('Documento enviado com sucesso!');
    } catch (e: any) {
      console.error('Document send error:', e);
      toast.error(e?.message || 'Falha ao enviar documento');
    } finally {
      setIsUploadingDocument(false);
    }
  };
  const handleDocumentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleDocumentSelect(file);
    e.currentTarget.value = '';
  };

  // Enriquecer conversas com dados de leads, responsável e tags
  const enrichedConversations = useMemo(() => {
    // First, group conversations by normalized phone number to eliminate duplicates
    const conversationsByNormalizedPhone = new Map<string, any[]>();
    conversations.forEach((conv: any) => {
      const normalizedPhone = normalizeForMatch(conv.phone_number || '');
      if (!normalizedPhone) return;
      if (!conversationsByNormalizedPhone.has(normalizedPhone)) {
        conversationsByNormalizedPhone.set(normalizedPhone, []);
      }
      conversationsByNormalizedPhone.get(normalizedPhone)!.push(conv);
    });

    // For each group, keep only the most recent conversation
    const uniqueConversations: any[] = [];
    conversationsByNormalizedPhone.forEach(convGroup => {
      // Sort by last_message_at descending and take the first one
      const sortedGroup = convGroup.sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA;
      });
      uniqueConversations.push(sortedGroup[0]);
    });

    // Now enrich the unique conversations
    return uniqueConversations.map((conv: any) => {
      const foundLead = findLeadByPhone(conv.phone_number || '');
      const assignee = foundLead?.assigned_to ? profiles.find(p => p.id === foundLead.assigned_to) : null;
      return {
        ...conv,
        leads: foundLead,
        assignee: assignee,
        displayName: foundLead ? getLeadDisplayName(foundLead) : conv.contact_name || conv.phone_number || 'Contato'
      };
    });
  }, [conversations, leads, profiles]);

  // Buscar todas as tags dos leads nas conversas
  const leadIds = enrichedConversations.filter(c => c.leads?.id).map(c => c.leads.id);
  const {
    data: leadTagsData = []
  } = useQuery({
    queryKey: ['lead-tags-for-conversations', currentWorkspace?.id, leadIds],
    queryFn: async () => {
      if (!currentWorkspace?.id || leadIds.length === 0) return [];
      const {
        data,
        error
      } = await supabase.from('lead_tag_relations').select(`
          id,
          lead_id,
          tag_id,
          lead_tags (
            id,
            name,
            color
          )
        `).in('lead_id', leadIds);
      if (error) {
        console.error('Error fetching lead tags:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentWorkspace?.id && leadIds.length > 0
  });

  // Filters and helpers - Improved search with accent normalization
  const normalizeText = (text: string) => 
    text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
  
  const filteredConversations = useMemo(() => {
    let result = enrichedConversations;
    
    // Filter by instance first
    if (instanceFilter !== 'all') {
      result = result.filter((conv: any) => conv.instance_id === instanceFilter);
    }
    
    // Then apply search filter
    if (search.trim()) {
      const searchNormalized = normalizeText(search);
      const searchDigits = search.replace(/\D/g, '');
      
      result = result.filter((conv: any) => {
        // Search in displayName
        const displayNameNormalized = normalizeText(conv.displayName || '');
        if (displayNameNormalized.includes(searchNormalized)) return true;
        
        // Search in contact_name
        const contactNameNormalized = normalizeText(conv.contact_name || '');
        if (contactNameNormalized.includes(searchNormalized)) return true;
        
        // Search in lead name (if exists)
        const leadNameNormalized = normalizeText(conv.lead?.name || '');
        if (leadNameNormalized.includes(searchNormalized)) return true;
        
        // Search in phone number
        const normalizedConvPhone = normalizeForMatch(conv.phone_number || '');
        if ((conv.phone_number || '').includes(search)) return true;
        if (searchDigits && normalizedConvPhone.includes(searchDigits)) return true;
        
        return false;
      });
    }
    
    return result;
  }, [enrichedConversations, search, instanceFilter]);
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
              
              {/* Instance filter */}
              {instances.length > 1 && (
                <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                  <SelectTrigger className="w-full mt-2 h-8 text-xs">
                    <SelectValue placeholder="Filtrar por instância" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as instâncias</SelectItem>
                    {instances.map((inst: any) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.display_name || inst.instance_name.replace(/^ws_\w+_/, '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y">
                  {filteredConversations.map((conv: any) => {
                const hasNewMessages = unreadConversations.has(conv.id);
                const leadTags = conv.leads?.id ? leadTagsData.filter((r: any) => r.lead_id === conv.leads.id).map((r: any) => r.lead_tags).filter(Boolean) : [];
                return <ConversationCard key={conv.id} conversation={conv} lead={conv.leads} assignee={conv.assignee} tags={leadTags} isSelected={selectedConvId === conv.id} unread={hasNewMessages || !conv.is_read} onClick={() => {
                  setSelectedConvId(conv.id);
                  
                  // Auto-selecionar a instância da conversa se disponível
                  const convInstanceName = getInstanceNameFromConversation(conv);
                  if (convInstanceName) {
                    const isConnected = connectedInstances.some((i: any) => i.instance_name === convInstanceName);
                    if (isConnected) {
                      setSelectedInstanceName(convInstanceName);
                    }
                  }
                  
                  setUnreadConversations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(conv.id);
                    return newSet;
                  });
                }} onCreateLead={() => {
                  setSelectedConvForLead(conv);
                  setCreateLeadOpen(true);
                }} />;
              })}
               </div>
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {selectedConv ? <>
                <div className="border-b p-4 bg-card">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium truncate">
                          {(() => {
                        const lead = findLeadByPhone(selectedConv.phone_number || '');
                        return lead ? getLeadDisplayName(lead) : selectedConv.contact_name || selectedConv.phone_number || 'Contato';
                      })()}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedConv.phone_number}
                        </p>
                        {(selectedConv as any).instance_id && (() => {
                          const conversationInstance = instances.find((i: any) => i.id === (selectedConv as any).instance_id);
                          if (conversationInstance) {
                            return (
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs text-emerald-600 font-medium">
                                  Atendido por: {conversationInstance.display_name || conversationInstance.instance_name.replace(/^ws_\w+_/, '')}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {!findLeadByPhone(selectedConv.phone_number || '') && <Button variant="outline" size="sm" className="gap-2 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700" onClick={() => {
                    setSelectedConvForLead(selectedConv);
                    setCreateLeadOpen(true);
                  }}>
                          <UserPlus className="h-4 w-4" />
                          Cadastrar Lead
                        </Button>}
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
                                {i.display_name || i.instance_name.replace(/^ws_\w+_/, '')}
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
                              <WhatsAppImage mediaUrl={m.media_url} alt="Imagem enviada" className="max-w-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(m.media_url, '_blank')} />
                            </div> : null}
                          
                          {/* Video Message */}
                          {m.message_type === 'video' && m.media_url ? <div className="mb-2">
                              <WhatsAppVideo mediaUrl={m.media_url} className="max-w-xs rounded-lg" />
                              {m.message_text && m.message_text !== 'Vídeo'}
                            </div> : null}
                          
                          {/* Document Message */}
                          {m.message_type === 'document' && m.media_url ? <div className="mb-2 flex items-center gap-2 p-2 border rounded-lg bg-background/50">
                              <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {m.attachment_name || m.message_text || 'Documento'}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={async () => {
                        try {
                          const response = await fetch(m.media_url);
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = m.attachment_name || 'documento';
                          link.click();
                          URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                          console.error('Download failed:', error);
                          window.open(m.media_url, '_blank');
                        }
                      }} title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div> : null}
                          
                          {/* Audio Message */}
                          {m.message_type === 'audio' ? <div className="mb-2 space-y-2">
                              {m.permanent_audio_url || m.media_url ? <AudioPlayer 
                                audioUrl={m.media_url || ''} 
                                permanentUrl={m.permanent_audio_url || undefined} 
                                messageId={m.id} 
                                className="min-w-[50%]" 
                              /> : <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <AlertCircle className="h-4 w-4" />
                                  {m.message_text || 'Áudio não disponível'}
                                </div>}
                            </div> : null}
                          
                          {/* Contact Message */}
                          {m.message_type === 'contact' ? <div className="mb-2">
                              {(() => {
                                try {
                                  const contactData = JSON.parse(m.message_text || '{}');
                                  return (
                                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-background/50">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <User className="h-5 w-5 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                          {contactData.displayName || 'Contato'}
                                        </p>
                                        {contactData.phone && (
                                          <p className="text-sm text-muted-foreground">
                                            +{contactData.phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 $2 $3-$4')}
                                          </p>
                                        )}
                                      </div>
                                      {contactData.phone && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            navigator.clipboard.writeText(contactData.phone);
                                            toast.success('Número copiado!');
                                          }}
                                          title="Copiar número"
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                } catch {
                                  return <p className="text-sm">{m.message_text}</p>;
                                }
                              })()}
                            </div> : null}
                          
                          {/* Text Message - só mostra se não for mídia */}
                          {!['image', 'video', 'document', 'audio', 'contact'].includes(m.message_type) && <p className="text-sm whitespace-pre-wrap">{m.message_text}</p>}
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
                  <Textarea
                    placeholder="Digite uma mensagem..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-none mb-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChatAudioSender
                        selectedConv={selectedConv}
                        selectedInstanceName={selectedInstanceName}
                        currentWorkspace={currentWorkspace}
                        onAudioSent={() => {
                          queryClient.invalidateQueries({
                            queryKey: ['whatsapp-messages', selectedConv?.id]
                          });
                          queryClient.invalidateQueries({
                            queryKey: ['whatsapp-conversations', currentWorkspace?.id]
                          });
                          setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }, 200);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!selectedInstanceName || isUploadingImage}
                        title="Enviar imagem"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={!selectedInstanceName || isUploadingVideo}
                        title="Enviar vídeo"
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => documentInputRef.current?.click()}
                        disabled={!selectedInstanceName || isUploadingDocument}
                        title="Enviar documento"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button
                      onClick={handleSend}
                      size="lg"
                      className="px-6"
                      disabled={!message.trim() || !selectedInstanceName || isSendingMessage}
                    >
                      <Send className="h-5 w-5 mr-2" />
                      Enviar
                    </Button>
                  </div>
                  
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/3gpp,video/quicktime" className="hidden" onChange={handleVideoInputChange} />
                  <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,application/msword" className="hidden" onChange={handleDocumentInputChange} />
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

      {/* Image Size Error Dialog */}
      <AlertDialog open={imageSizeError?.open ?? false} onOpenChange={open => !open && setImageSizeError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Imagem muito grande
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Não foi possível reduzir a imagem <strong>{imageSizeError?.fileName}</strong> para um tamanho aceitável.
              </p>
              <p>
                Após otimização automática, o arquivo ainda tem{' '}
                <strong>{((imageSizeError?.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB</strong>,
                mas o limite máximo é de <strong>{MAX_IMAGE_SIZE_MB} MB</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                A imagem original pode ser muito complexa ou conter muitos detalhes. Por favor, use uma imagem com menor resolução ou qualidade.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImageSizeError(null)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Size Error Dialog (Video/Document) */}
      <AlertDialog open={fileSizeError?.open ?? false} onOpenChange={open => !open && setFileSizeError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {fileSizeError?.fileType === 'video' ? 'Vídeo muito grande' : 'Documento muito grande'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                O arquivo <strong>{fileSizeError?.fileName}</strong> tem{' '}
                <strong>{((fileSizeError?.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB</strong>,
                mas o limite máximo é de{' '}
                <strong>{((fileSizeError?.maxSize || 0) / (1024 * 1024)).toFixed(0)} MB</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                Por favor, escolha um arquivo menor ou comprima-o antes de enviar.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFileSizeError(null)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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