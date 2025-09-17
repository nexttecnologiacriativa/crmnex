import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Eye, EyeOff, Sparkles, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode: () => void;
}

export default function LoginForm({ onToggleMode }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { signIn, loading } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const email = watch('email');

  const onSubmit = async (data: LoginForm) => {
    try {
      console.log('Login form submitted for:', data.email);
      await signIn(data.email, data.password);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Login form error:', error);
      
      let errorMessage = 'Erro ao fazer login';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos. Tente usar "Esqueci minha senha" para redefinir.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Muitas tentativas de login. Tente novamente em alguns minutos.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('Digite seu email primeiro');
      return;
    }

    setIsResettingPassword(true);
    
    try {
      console.log('Password reset requested for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast.error('Erro ao enviar email de recuperação: ' + error.message);
      } else {
        console.log('Password reset email sent successfully');
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-indigo-400/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <Card className="w-full max-w-md relative bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-4xl font-bold text-white drop-shadow-lg">
            Entrar no Glav
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="h-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/20 backdrop-blur-sm transition-all duration-200"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-300">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  className="h-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/20 backdrop-blur-sm transition-all duration-200 pr-12"
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-300">{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-white/70 hover:text-white transition-colors"
                onClick={handlePasswordReset}
                disabled={isResettingPassword || !email}
              >
                {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Esqueci minha senha
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-white/70">ou</span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-white/80">
              Não tem uma conta?{' '}
              <Button 
                variant="link" 
                className="p-0 text-white hover:text-white/80 font-medium underline" 
                onClick={onToggleMode}
              >
                Criar conta gratuita
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
