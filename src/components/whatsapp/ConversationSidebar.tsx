import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppConversation {
  id: string;
  phone_number: string;
  contact_name: string;
  last_message_at: string;
  is_read: boolean;
  message_count: number;
  workspace_id: string;
}

interface ConversationSidebarProps {
  workspaceId: string;
  selectedConversationId: string | null;
  onConversationSelect: (conversation: WhatsAppConversation) => void;
  className?: string;
}

export function ConversationSidebar({
  workspaceId,
  selectedConversationId,
  onConversationSelect,
  className
}: ConversationSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['whatsapp-conversations', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      return data as WhatsAppConversation[];
    },
    enabled: !!workspaceId,
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  const filteredConversations = conversations.filter(conv =>
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone_number.includes(searchTerm)
  );

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM', { locale: ptBR });
    }
  };

  const getInitials = (name: string, phone: string) => {
    if (name && name.trim()) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone.slice(-2);
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Campo de busca */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Botão Nova Conversa */}
      <div className="p-3 border-b">
        <Button variant="outline" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma conversa encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tente buscar por outro termo' : 'Suas conversas aparecerão aqui'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50 border-0 shadow-none",
                  selectedConversationId === conversation.id && "bg-muted"
                )}
                onClick={() => onConversationSelect(conversation)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-sm">
                          {getInitials(conversation.contact_name, conversation.phone_number)}
                        </AvatarFallback>
                      </Avatar>
                      {!conversation.is_read && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={cn(
                          "text-sm truncate",
                          !conversation.is_read && "font-semibold"
                        )}>
                          {conversation.contact_name || conversation.phone_number}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {formatLastMessageTime(conversation.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.phone_number}
                        </p>
                        {conversation.message_count > 0 && !conversation.is_read && (
                          <Badge variant="default" className="h-5 min-w-5 text-xs px-1.5">
                            {conversation.message_count > 99 ? '99+' : conversation.message_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}