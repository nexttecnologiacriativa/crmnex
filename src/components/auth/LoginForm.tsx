import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Eye, EyeOff, Quote } from 'lucide-react';
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
    defaultValues: {
      email: 'demo@next.tec.br',
    },
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
    <div className="min-h-screen flex bg-[#1e5bb8]">
      {/* Coluna Esquerda - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/nexcrm-logo.png" alt="NexCRM" className="h-12" />
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-[#003366] mb-2 text-center">
            Acesse nossa Plataforma
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Entre com suas credenciais para continuar
          </p>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                {...register('email')}
                className="bg-white border-gray-300 text-gray-900 h-11"
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  {...register('password')}
                  className="bg-white border-gray-300 text-gray-900 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
              className="w-full text-sm text-[#003366] hover:text-[#003366]/80 hover:bg-gray-100 h-auto py-2"
            >
              {isResettingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Esqueceu sua senha?'
              )}
            </Button>

            <Button
              type="submit"
              className="w-full bg-[#A4D65E] hover:bg-[#93c14d] text-[#003366] font-semibold h-11 rounded-lg"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? 'Entrando...' : 'Continuar'}
            </Button>
          </form>

          {/* Link para Cadastro */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-[#003366] hover:text-[#003366]/80 transition-colors text-sm"
            >
              Não tem uma conta?{' '}
              <span className="font-semibold underline">Cadastre-se</span>
            </button>
          </div>
        </div>
      </div>

      {/* Coluna Direita - Visual */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        {/* Gradiente de fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366] via-[#1e5bb8] to-[#A4D65E]/30"></div>
        
        {/* Elementos decorativos */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#A4D65E]/10 rounded-full blur-3xl"></div>

        {/* Card de Depoimento */}
        <div className="relative z-10 max-w-lg">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
            <Quote className="w-12 h-12 text-[#A4D65E] mb-6" />
            <p className="text-white text-lg leading-relaxed mb-6">
              "O NexCRM transformou completamente a forma como gerenciamos nossos leads e pipeline de vendas. Aumentamos nossa conversão em 40% no primeiro trimestre."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#A4D65E] to-[#003366] rounded-full flex items-center justify-center text-white font-bold">
                JM
              </div>
              <div>
                <p className="text-white font-semibold">João Mendes</p>
                <p className="text-white/70 text-sm">CEO, TechSolutions</p>
              </div>
            </div>
          </div>

          {/* Indicadores de slides */}
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div className="w-2 h-2 bg-white/30 rounded-full"></div>
            <div className="w-2 h-2 bg-white/30 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
