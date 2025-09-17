import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  invitationCode: z.string().min(1, 'Código de convite é obrigatório'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => data.invitationCode === 'EUSOUGLAV', {
  message: 'Código de convite inválido',
  path: ['invitationCode'],
});

type SignUpForm = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
  onToggleMode: () => void;
}

export default function SignUpForm({ onToggleMode }: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, loading } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpForm) => {
    try {
      console.log('Form submitted, attempting signup for:', data.email);
      await signUp(data.email, data.password, data.fullName);
      toast.success('Conta criada com sucesso! Você já pode fazer login.');
      reset();
    } catch (error: any) {
      console.error('Signup form error:', error);
      
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Este email já está cadastrado. Tente fazer login.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Email inválido.';
      } else if (error.message?.includes('Password')) {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      } else if (error.message?.includes('Database error')) {
        errorMessage = 'Erro interno do sistema. Tente novamente em alguns instantes.';
      } else if (error.message?.includes('signup disabled')) {
        errorMessage = 'Cadastro temporariamente desabilitado.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
            Criar Conta no Glav
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white font-medium">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                className="h-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/20 backdrop-blur-sm transition-all duration-200"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-red-300">{errors.fullName.message}</p>
              )}
            </div>

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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-300">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white font-medium">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirme sua senha"
                  className="h-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/20 backdrop-blur-sm transition-all duration-200 pr-12"
                  {...register('confirmPassword')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-300">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invitationCode" className="text-white font-medium">Código de Convite</Label>
              <Input
                id="invitationCode"
                type="text"
                placeholder="Seu código de convite"
                className="h-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/20 backdrop-blur-sm transition-all duration-200"
                {...register('invitationCode')}
              />
              {errors.invitationCode && (
                <p className="text-sm text-red-300">{errors.invitationCode.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? 'Criando conta...' : 'Criar Conta Gratuita'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-white/70">ou</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-white/80">
              Já tem uma conta?{' '}
              <Button 
                variant="link" 
                className="p-0 text-white hover:text-white/80 font-medium underline" 
                onClick={onToggleMode}
              >
                Fazer login
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
