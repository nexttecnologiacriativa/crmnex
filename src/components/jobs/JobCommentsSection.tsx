import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, AtSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceMembers } from '@/hooks/useJobs';
import { toast } from 'sonner';

interface JobComment {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  mentioned_users: string[];
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface JobCommentsSectionProps {
  jobId: string;
}

export default function JobCommentsSection({ jobId }: JobCommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: workspaceMembers = [] } = useWorkspaceMembers();

  const { data: comments = [] } = useQuery({
    queryKey: ['job-comments', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_comments')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as JobComment[];
    },
    enabled: !!jobId,
  });

  const createComment = useMutation({
    mutationFn: async (commentData: { content: string; mentioned_users: string[] }) => {
      if (!user?.id) throw new Error('Usuário não encontrado');
      
      const { data, error } = await supabase
        .from('job_comments')
        .insert({
          job_id: jobId,
          user_id: user.id,
          content: commentData.content,
          mentioned_users: commentData.mentioned_users,
        })
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-comments', jobId] });
      setNewComment('');
      toast.success('Comentário adicionado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar comentário: ' + error.message);
    },
  });

  // Detectar @ e filtrar usuários
  useEffect(() => {
    const lastAtIndex = newComment.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const searchTerm = newComment.slice(lastAtIndex + 1).toLowerCase();
      const filtered = workspaceMembers.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm) ||
        member.email?.toLowerCase().includes(searchTerm)
      );
      setFilteredMembers(filtered);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setFilteredMembers([]);
    }
  }, [newComment, workspaceMembers]);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    // Extrair menções (@usuario)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(newComment)) !== null) {
      const mentionedUser = workspaceMembers.find(
        member => member.full_name?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedUser) {
        mentions.push(mentionedUser.id);
      }
    }
    
    createComment.mutate({
      content: newComment,
      mentioned_users: mentions,
    });
  };

  const handleMentionUser = (userName: string) => {
    const lastAtIndex = newComment.lastIndexOf('@');
    const beforeMention = newComment.slice(0, lastAtIndex);
    const afterMention = newComment.slice(lastAtIndex).replace(/@\w*/, `@${userName} `);
    setNewComment(beforeMention + afterMention);
    setShowMentions(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comentários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de comentários */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhum comentário ainda.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {comment.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.profiles?.full_name || 'Usuário'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Adicionar novo comentário */}
        <div className="space-y-2 relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Escreva um comentário... Use @nome para mencionar alguém"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createComment.isPending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de usuários para menção */}
          {showMentions && filteredMembers.length > 0 && (
            <Card className="absolute bottom-full left-0 right-0 z-10 mb-2 max-h-40 overflow-y-auto">
              <CardContent className="p-2">
                {filteredMembers.map((member) => (
                  <Button
                    key={member.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleMentionUser(member.full_name || 'Usuario')}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback>
                        {member.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {member.full_name || member.email}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
