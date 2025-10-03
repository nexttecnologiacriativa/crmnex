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

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  invitationCode: z.string().min(1, 'Código de convite é obrigatório'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => data.invitationCode === 'EUSOUNEXT', {
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
    defaultValues: {
      email: 'demo@next.tec.br',
    },
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
    <div className="min-h-screen flex bg-[#1e5bb8]">
      {/* Coluna Esquerda - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl my-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/nexcrm-logo.png" alt="NexCRM" className="h-12" />
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-[#003366] mb-2 text-center">
            Criar sua Conta
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Preencha os dados para começar
          </p>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-700 text-sm font-medium">
                Nome Completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Digite seu nome completo"
                {...register('fullName')}
                className="bg-white border-gray-300 text-gray-900 h-11"
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm">{errors.fullName.message}</p>
              )}
            </div>

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
                  placeholder="Mínimo 6 caracteres"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 text-sm font-medium">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite a senha novamente"
                  {...register('confirmPassword')}
                  className="bg-white border-gray-300 text-gray-900 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invitationCode" className="text-gray-700 text-sm font-medium">
                Código de Convite
              </Label>
              <Input
                id="invitationCode"
                type="text"
                placeholder="Digite o código de convite"
                {...register('invitationCode')}
                className="bg-white border-gray-300 text-gray-900 h-11"
              />
              {errors.invitationCode && (
                <p className="text-red-500 text-sm">{errors.invitationCode.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#A4D65E] hover:bg-[#93c14d] text-[#003366] font-semibold h-11 rounded-lg mt-6"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          {/* Link para Login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-[#003366] hover:text-[#003366]/80 transition-colors text-sm"
            >
              Já tem uma conta?{' '}
              <span className="font-semibold underline">Entrar</span>
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
              "Implementar o NexCRM foi a melhor decisão para nosso time de vendas. A plataforma é intuitiva e nos ajudou a organizar todo o processo comercial."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#A4D65E] to-[#003366] rounded-full flex items-center justify-center text-white font-bold">
                MS
              </div>
              <div>
                <p className="text-white font-semibold">Maria Silva</p>
                <p className="text-white/70 text-sm">Diretora Comercial, VendaMais</p>
              </div>
            </div>
          </div>

          {/* Indicadores de slides */}
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-2 h-2 bg-white/30 rounded-full"></div>
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div className="w-2 h-2 bg-white/30 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
