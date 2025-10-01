import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationCardProps {
  conversation: any;
  lead?: any;
  assignee?: any;
  tags?: any[];
  isSelected: boolean;
  onClick: () => void;
  unread?: boolean;
}

export default function ConversationCard({
  conversation,
  lead,
  assignee,
  tags = [],
  isSelected,
  onClick,
  unread = false
}: ConversationCardProps) {
  const displayName = lead?.name || conversation.contact_name || conversation.phone_number || 'Contato';
  const formatTime = (iso?: string) => iso ? format(new Date(iso), 'HH:mm', { locale: ptBR }) : '';
  
  // Initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={`p-3 cursor-pointer border-b hover:bg-accent/50 transition-colors ${
        isSelected ? 'bg-accent' : ''
      } ${unread ? 'bg-primary/5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className={lead ? 'bg-primary/20 text-primary' : 'bg-muted'}>
            {lead ? getInitials(displayName) : <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header: Nome e Hora */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{displayName}</span>
              {lead && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 flex-shrink-0">
                  Lead
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(conversation.last_message_at)}
            </span>
          </div>

          {/* Responsável */}
          {assignee && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <User className="h-3 w-3" />
              <span className="truncate">{assignee.full_name || assignee.email}</span>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs px-1.5 py-0 h-5"
                  style={{ 
                    borderColor: tag.color,
                    color: tag.color 
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Message Count */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            <span>{conversation.message_count || 0} mensagens</span>
            {unread && (
              <Badge variant="default" className="ml-auto text-xs px-1.5 py-0 h-5">
                Nova
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
