
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCreateConversation } from '@/hooks/useWhatsApp';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useLeads } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { getLeadDisplayName } from '@/lib/leadUtils';
import { toast } from 'sonner';

interface CreateConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateConversationDialog({ open, onOpenChange }: CreateConversationDialogProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  
  const { currentWorkspace } = useWorkspace();
  const { data: leads = [] } = useLeads();
  const createConversation = useCreateConversation();

  // Buscar leads por nome ou telefone
  useEffect(() => {
    if (searchTerm.length > 2) {
      const filtered = leads.filter(lead => {
        const leadDisplayName = lead.name || lead.email || '';
        return leadDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (lead.phone && lead.phone.includes(searchTerm));
      });
      setSearchResults(filtered);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [searchTerm, leads]);

  const handleLeadSelect = (lead: any) => {
    setPhone(lead.phone || '');
    setName(getLeadDisplayName(lead));
    setSearchTerm('');
    setShowSearch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim() || !currentWorkspace) return;

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Buscar lead existente pelo telefone
      const { data: existingLead }: { data: { id: string; name: string; email?: string; company: string } | null } = await supabase
        .from('leads')
        .select('id, name, email, company')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phone', cleanPhone)
        .single();

      console.log('Lead encontrado:', existingLead);

      // Se encontrou um lead, usar os dados dele
      const conversationData = {
        workspace_id: currentWorkspace.id,
        phone_number: cleanPhone,
        contact_name: existingLead ? getLeadDisplayName(existingLead) : (name.trim() || undefined),
        lead_id: existingLead?.id || undefined
      };

      createConversation.mutate(conversationData, {
        onSuccess: () => {
          setPhone('');
          setName('');
          setSearchTerm('');
          onOpenChange(false);
          if (existingLead) {
            toast.success(`Conversa criada com ${getLeadDisplayName(existingLead)} (Lead existente)`);
          }
        }
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Busca de Lead */}
          <div className="relative">
            <Label htmlFor="search">Buscar Lead Existente</Label>
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome ou telefone do lead..."
            />
            
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                {searchResults.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => handleLeadSelect(lead)}
                    className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"
                  >
                    <div className="font-medium">{getLeadDisplayName(lead)}</div>
                    <div className="text-sm text-gray-500">
                      {lead.phone} {lead.company && `• ${lead.company}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="name">Nome do Contato</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (será usado se não houver lead cadastrado)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Se já existir um lead com este telefone, os dados dele serão usados automaticamente
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createConversation.isPending}
              className="flex-1"
            >
              {createConversation.isPending ? 'Criando...' : 'Criar Conversa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
