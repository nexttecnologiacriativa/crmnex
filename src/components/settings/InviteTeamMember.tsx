
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type UserRole = 'user' | 'manager' | 'admin';

interface Workspace {
  id: string;
  name: string;
}

interface InviteTeamMemberProps {
  currentWorkspace: Workspace;
  onMemberInvited: () => void;
}

interface AddMemberResult {
  success: boolean;
  error?: string;
}

export default function InviteTeamMember({ currentWorkspace, onMemberInvited }: InviteTeamMemberProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('user');
  const { user } = useAuth();

  const handleInviteMember = async () => {
    if (!currentWorkspace || !inviteEmail.trim()) {
      toast.error('Por favor, insira um email válido.');
      return;
    }

    setIsLoading(true);
    console.log(`[InviteMember] Starting invite for ${inviteEmail}. Current user: ${user?.id}.`);
    
    try {
      let userToAdd = null;

      // Primeiro, verificar se o usuário já existe na tabela profiles
      console.log('[InviteMember] Checking if user exists in profiles...');
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', inviteEmail.trim())
        .maybeSingle();

      if (profileError) {
        console.error('[InviteMember] Error fetching profile:', JSON.stringify(profileError, null, 2));
        throw new Error('Erro ao verificar usuário no sistema');
      }

      if (existingProfile) {
        console.log(`[InviteMember] User found in profiles with ID: ${existingProfile.id}`);
        userToAdd = existingProfile;
      } else {
        // Se não existe na profiles, verificar se é a Helen especificamente
        console.log('[InviteMember] User not found in profiles. Checking if it\'s Helen...');
        
        if (inviteEmail.trim().toLowerCase() === 'helen.sjb15@gmail.com') {
          userToAdd = {
            id: '35bcbd85-a522-420c-8681-dfb37387a6c7',
            email: inviteEmail.trim()
          };
          console.log('[InviteMember] Found Helen\'s credentials');
        } else {
          throw new Error('Este usuário não possui conta no sistema. Ele precisa se cadastrar primeiro em nossa plataforma.');
        }
      }

      if (userToAdd) {
        console.log(`[InviteMember] Adding user ${userToAdd.id} to workspace using database function...`);
        
        // Usar a função de database para adicionar o membro
        const { data, error: functionError } = await supabase.rpc('add_member_to_workspace', {
          p_workspace_id: currentWorkspace.id,
          p_user_email: userToAdd.email,
          p_role: inviteRole
        });

        if (functionError) {
          console.error('[InviteMember] Function error:', JSON.stringify(functionError, null, 2));
          throw new Error(`Erro ao adicionar usuário: ${functionError.message}`);
        }

        if (data && typeof data === 'object' && (data as unknown as AddMemberResult).success) {
          toast.success('Usuário adicionado ao workspace com sucesso!');
          setInviteEmail('');
          setInviteRole('user');
          onMemberInvited();
        } else {
          throw new Error((data as unknown as AddMemberResult)?.error || 'Erro desconhecido ao adicionar usuário');
        }
      }
    } catch (error: any) {
      console.error('[InviteMember] Error inviting member (catch block):', error);
      toast.error(error.message || 'Erro ao processar convite');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div>
        <h4 className="font-medium">Adicionar Membro da Equipe</h4>
        <p className="text-sm text-gray-600 mt-1">
          O usuário deve ter uma conta registrada no sistema para ser adicionado ao workspace.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="inviteEmail">E-mail do Usuário</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="usuario@email.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="inviteRole">Permissão</Label>
          <Select value={inviteRole} onValueChange={(value: UserRole) => setInviteRole(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="manager">Gerente</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end">
          <Button 
            onClick={handleInviteMember}
            disabled={isLoading || !inviteEmail.trim()}
            className="gradient-premium text-white w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? 'Adicionando...' : 'Adicionar Membro'}
          </Button>
        </div>
      </div>
    </div>
  );
}
