
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useCustomFields } from '@/hooks/useCustomFields';

interface CustomFieldsFormProps {
  form: UseFormReturn<any>;
  workspaceId: string | undefined;
}

export default function CustomFieldsForm({ form, workspaceId }: CustomFieldsFormProps) {
  const { data: customFields = [] } = useCustomFields(workspaceId);

  if (customFields.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Campos Personalizados</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customFields.map((field) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`custom_fields.${field.name}`}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  {field.field_type === 'textarea' ? (
                    <Textarea
                      {...formField}
                      placeholder={`Digite ${field.name.toLowerCase()}`}
                    />
                  ) : field.field_type === 'number' ? (
                    <Input
                      {...formField}
                      type="number"
                      placeholder={`Digite ${field.name.toLowerCase()}`}
                    />
                  ) : field.field_type === 'date' ? (
                    <Input
                      {...formField}
                      type="date"
                    />
                  ) : (
                    <Input
                      {...formField}
                      placeholder={`Digite ${field.name.toLowerCase()}`}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}
