import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from '@/components/ui/form';

interface QualitativeTabProps {
  form: UseFormReturn<any>;
  onSave: (data: any) => void;
}

export const QualitativeTab = ({ form }: QualitativeTabProps) => {
  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Projeto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Lançamento Produto X" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaign_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Campanha *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="semente">Semente</SelectItem>
                        <SelectItem value="interno">Interno</SelectItem>
                        <SelectItem value="desafio">Desafio</SelectItem>
                        <SelectItem value="perpetuo">Perpétuo</SelectItem>
                        <SelectItem value="campanha">Campanha</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do responsável" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise Qualitativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="what_happened"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que aconteceu?</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva os principais eventos e acontecimentos da campanha..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="what_worked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que deu certo?</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Quais estratégias, táticas ou elementos funcionaram bem..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="what_could_improve"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que poderia melhorar?</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Identifique pontos de melhoria e oportunidades perdidas..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="next_steps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próximos passos / Ações futuras</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Defina as ações e estratégias para futuras campanhas..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </Form>
  );
};