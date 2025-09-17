
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConversationHistory from './ConversationHistory';
import WhatsAppWebInterface from './WhatsAppWebInterface';
import { useWhatsAppConversations, useCreateConversation } from '@/hooks/useWhatsApp';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMetaTemplates, useSendMetaTemplate } from '@/hooks/useMetaTemplates';
import { Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppIntegration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isProcessingParams, setIsProcessingParams] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [pendingPhoneData, setPendingPhoneData] = useState<{phone: string, name?: string, leadId?: string} | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  
  const phoneParam = searchParams.get('phone');
  const nameParam = searchParams.get('name');
  const leadIdParam = searchParams.get('leadId');
  
  const { currentWorkspace } = useWorkspace();
  const { data: conversations = [], refetch: refetchConversations } = useWhatsAppConversations();
  const { data: templates = [] } = useMetaTemplates();
  const createConversation = useCreateConversation();
  const sendTemplate = useSendMetaTemplate();

  const checkRecentConversation = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const existingConversation = conversations.find(conv => 
      conv.phone_number.replace(/\D/g, '') === cleanPhone
    );

    if (existingConversation) {
      const lastMessageTime = new Date(existingConversation.last_message_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
      
      if (diffHours <= 24) {
        return existingConversation;
      }
    }

    return null;
  };

  useEffect(() => {
    if (phoneParam && currentWorkspace && !isProcessingParams && conversations.length > 0) {
      setIsProcessingParams(true);
      
      const cleanPhone = phoneParam.replace(/\D/g, '');
      const recentConversation = checkRecentConversation(cleanPhone);

      if (recentConversation) {
        console.log('Found recent conversation within 24h window:', recentConversation.id);
        setSelectedConversationId(recentConversation.id);
        setSearchParams({});
        setIsProcessingParams(false);
      } else {
        console.log('No recent conversation found, need to send template first');
        setPendingPhoneData({ 
          phone: cleanPhone, 
          name: nameParam || undefined,
          leadId: leadIdParam || undefined
        });
        setShowTemplateDialog(true);
        setIsProcessingParams(false);
      }
    }
  }, [phoneParam, nameParam, leadIdParam, currentWorkspace, conversations, isProcessingParams]);

  const handleTemplateSelect = async (template: any) => {
    if (!pendingPhoneData || !currentWorkspace) return;

    try {
      console.log('Sending template to:', pendingPhoneData.phone, 'Template:', template.name);
      
      // Enviar template primeiro
      await sendTemplate.mutateAsync({
        to: pendingPhoneData.phone,
        templateName: template.name,
        conversationId: undefined
      });

      // Aguardar processamento do template
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Criar conversa após envio do template
      const newConversation = await createConversation.mutateAsync({
        workspace_id: currentWorkspace.id,
        phone_number: pendingPhoneData.phone,
        contact_name: pendingPhoneData.name || undefined,
        lead_id: pendingPhoneData.leadId || undefined,
      });

      console.log('Template sent and conversation created:', newConversation.id);
      
      // Aguardar mais um pouco para garantir que o template seja processado
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Forçar refresh das conversas
      await refetchConversations();
      
      // Aguardar mais um pouco para garantir que a conversa está carregada
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSelectedConversationId(newConversation.id);
      setShowTemplateDialog(false);
      setPendingPhoneData(null);
      setTemplateSearch('');
      setSearchParams({});
      
      toast.success('Template enviado e conversa criada! A mensagem deve aparecer em alguns segundos.');
    } catch (error) {
      console.error('Error sending template and creating conversation:', error);
      toast.error('Erro ao enviar template');
    }
  };

  const filteredTemplates = templates
    .filter(t => t.status === 'APPROVED')
    .filter(template => 
      templateSearch === '' || 
      template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      template.category.toLowerCase().includes(templateSearch.toLowerCase())
    );

  return (
    <>
      <WhatsAppWebInterface />
      
      <Dialog open={showTemplateDialog} onOpenChange={(open) => {
        setShowTemplateDialog(open);
        if (!open) {
          setPendingPhoneData(null);
          setTemplateSearch('');
          setSearchParams({});
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Conversa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-orange-800 font-medium">
                    Não há conversa ativa com este contato
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Para iniciar uma conversa, é necessário enviar um template aprovado primeiro devido às políticas do WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    onClick={() => handleTemplateSelect(template)}
                    disabled={sendTemplate.isPending}
                    className="w-full justify-start text-left h-auto p-3"
                  >
                    <div>
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{template.category}</div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">
                    {templateSearch ? 'Nenhum template encontrado' : 'Nenhum template aprovado disponível'}
                  </p>
                  {!templateSearch && (
                    <p className="text-xs text-red-600 mt-1">
                      Configure templates no Meta Business Manager primeiro.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateDialog(false);
                setPendingPhoneData(null);
                setTemplateSearch('');
                setSearchParams({});
              }}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
