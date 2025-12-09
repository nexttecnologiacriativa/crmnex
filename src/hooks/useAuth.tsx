import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
  updated_at: string;
  password_reset_required?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      console.log('Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      console.log('Profile fetched successfully:', data);
      return data as Profile;
    },
    enabled: !!user,
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('Attempting sign in for:', email);
      
      // Verificar se o usuário existe no banco de dados
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      console.log('Profile check result:', { profileCheck, profileError });
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
      } else if (profileCheck) {
        console.log('Profile found in database:', profileCheck);
      } else {
        console.log('No profile found for email:', email);
      }

      // Verificar se a conta existe no auth
      console.log('Attempting Supabase auth login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        console.error('Error code:', error.message);
        console.error('Error status:', error.status);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('Sign in successful:', data.user?.id);
      console.log('User email confirmed:', data.user?.email_confirmed_at);
      console.log('User created at:', data.user?.created_at);
      console.log('User last sign in:', data.user?.last_sign_in_at);
      console.log('User data:', data.user);
      
      return data;
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      console.log('Starting signup process for:', email);
      
      // Verificar se o email já existe
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        throw new Error('Este email já está cadastrado. Tente fazer login.');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Signup error:', error);
        
        // Melhor tratamento de erros específicos
        if (error.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado. Tente fazer login.');
        } else if (error.message.includes('Invalid email')) {
          throw new Error('Email inválido.');
        } else if (error.message.includes('Password should be at least')) {
          throw new Error('Senha deve ter pelo menos 6 caracteres.');
        } else if (error.message.includes('Signup is disabled')) {
          throw new Error('Cadastro temporariamente desabilitado.');
        }
        
        throw error;
      }

      console.log('Signup successful:', data.user?.id);
      console.log('User needs email confirmation:', !data.user?.email_confirmed_at);
      
      return data;
    },
  });

  useEffect(() => {
    console.log('Setting up auth state listeners...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id || 'no user');
      if (session?.user) {
        console.log('Initial session user email:', session.user.email);
        console.log('Initial session user confirmed:', session.user.email_confirmed_at);
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session?.user?.id || 'no user');
        
        // Se for um evento de SIGNED_OUT, garantir que limpamos tudo
        if (event === 'SIGNED_OUT') {
          console.log('SIGNED_OUT event detected, clearing all state');
          setUser(null);
          setLoading(false);
          queryClient.clear();
          return;
        }
        
        // Para outros eventos, processar normalmente
        if (session?.user) {
          console.log('Auth change user email:', session.user.email);
          console.log('Auth change user confirmed:', session.user.email_confirmed_at);
        }
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up auth state listeners...');
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    await signInMutation.mutateAsync({ email, password });
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    await signUpMutation.mutateAsync({ email, password, fullName });
  };

  const signOut = async () => {
    console.log('Starting sign out process...');
    
    try {
      // Primeiro limpar o estado local imediatamente
      setUser(null);
      setLoading(true);
      
      // Limpar cache do React Query
      queryClient.clear();
      
      // Fazer logout no Supabase com força total
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Remove sessão de todos os dispositivos
      });
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Limpar localStorage manualmente caso ainda tenha algo
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('supabase.') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Cleared localStorage keys:', keysToRemove);
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
      
      // Limpar sessionStorage também
      try {
        sessionStorage.clear();
      } catch (e) {
        console.error('Error clearing sessionStorage:', e);
      }
      
    } catch (error) {
      console.error('Unexpected error during signout:', error);
    }
    
    console.log('Sign out process completed');
    setLoading(false);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        profile, 
        loading: loading || signInMutation.isPending || signUpMutation.isPending,
        signIn, 
        signUp, 
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
