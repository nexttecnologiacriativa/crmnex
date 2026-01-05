import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useLeadTags } from '@/hooks/useLeadTags';
import { supabase } from '@/integrations/supabase/client';
import { Save, Tag, ArrowRight } from 'lucide-react';

interface FormField {
  name: string;
  values?: string[];
}

interface MetaLeadForm {
  id: string;
  integration_id: string;
  meta_form_id: string;
  form_name: string;
  page_id: string;
  page_name: string;
  fields_schema: FormField[];
  is_active: boolean;
  last_sync_at: string | null;
  selected_tag_ids?: string[];
  field_mapping?: Record<string, string>;
}

interface MetaFormSettingsProps {
  form: MetaLeadForm;
  integrationTagIds: string[];
  onUpdate: () => void;
}

const CRM_FIELDS = [
  { value: 'name', label: 'Nome' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'company', label: 'Empresa' },
  { value: 'position', label: 'Cargo' },
  { value: 'value', label: 'Valor' },
  { value: 'notes', label: 'Observações' },
  { value: '_ignore', label: '(Ignorar campo)' },
];

export default function MetaFormSettings({ form, integrationTagIds, onUpdate }: MetaFormSettingsProps) {
  const { toast } = useToast();
  const { data: tags = [] } = useLeadTags();
  
  const [useCustomTags, setUseCustomTags] = useState(
    (form.selected_tag_ids?.length ?? 0) > 0
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    form.selected_tag_ids || []
  );
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(
    form.field_mapping || {}
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when form changes
  useEffect(() => {
    setUseCustomTags((form.selected_tag_ids?.length ?? 0) > 0);
    setSelectedTagIds(form.selected_tag_ids || []);
    setFieldMapping(form.field_mapping || {});
  }, [form.id, form.selected_tag_ids, form.field_mapping]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleFieldMappingChange = (metaField: string, crmField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [metaField]: crmField === '_ignore' ? '' : crmField
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: { selected_tag_ids?: string[]; field_mapping?: Record<string, string> } = {
        field_mapping: fieldMapping
      };

      // Only set selected_tag_ids if using custom tags
      if (useCustomTags) {
        updateData.selected_tag_ids = selectedTagIds;
      } else {
        updateData.selected_tag_ids = [];
      }

      const { error } = await supabase
        .from('meta_lead_forms')
        .update(updateData)
        .eq('id', form.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações do formulário foram atualizadas"
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving form settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldsSchema = form.fields_schema || [];

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{form.form_name}</p>
          <p className="text-xs text-muted-foreground">{form.page_name}</p>
        </div>
        <Badge variant="outline">
          {fieldsSchema.length} campos
        </Badge>
      </div>

      <Separator />

      {/* Tags Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <Label className="font-medium">Tags do Formulário</Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id={`custom-tags-${form.id}`}
            checked={useCustomTags}
            onCheckedChange={(checked) => {
              setUseCustomTags(!!checked);
              if (!checked) setSelectedTagIds([]);
            }}
          />
          <Label htmlFor={`custom-tags-${form.id}`} className="text-sm cursor-pointer">
            Usar tags específicas para este formulário
          </Label>
        </div>

        {useCustomTags ? (
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
            {tags.map((tag) => (
              <label 
                key={tag.id} 
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => handleTagToggle(tag.id)}
                />
                <Badge 
                  variant="outline" 
                  style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                >
                  {tag.name}
                </Badge>
              </label>
            ))}
            {tags.length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhuma tag disponível</span>
            )}
          </div>
        ) : (
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2">Usando tags da integração:</p>
            <div className="flex flex-wrap gap-1">
              {integrationTagIds.length > 0 ? (
                integrationTagIds.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  return tag ? (
                    <Badge 
                      key={tagId} 
                      variant="outline" 
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ) : null;
                })
              ) : (
                <span className="text-sm text-muted-foreground">Nenhuma tag configurada</span>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Field Mapping Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Label className="font-medium">Mapeamento de Campos</Label>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Configure para qual campo do CRM cada campo do formulário Meta deve ir
        </p>

        {fieldsSchema.length > 0 ? (
          <div className="space-y-2">
            {fieldsSchema.map((field, index) => {
              // Handle different field formats safely
              let fieldName = '';
              if (typeof field === 'string') {
                fieldName = field;
              } else if (field && typeof field === 'object' && 'name' in field) {
                fieldName = String(field.name || '');
              }
              
              // Skip empty field names
              if (!fieldName) return null;
              
              const fieldNameLower = fieldName.toLowerCase();
              const currentMapping = fieldMapping[fieldName] || fieldMapping[fieldNameLower] || '';
              
              return (
                <div key={index} className="flex items-center gap-3 p-2 border rounded bg-muted/30">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{fieldName}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="w-40">
                    <Select 
                      value={currentMapping || '_auto'}
                      onValueChange={(value) => handleFieldMappingChange(fieldNameLower, value === '_auto' ? '' : value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Automático" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_auto">Automático</SelectItem>
                        {CRM_FIELDS.map(crmField => (
                          <SelectItem key={crmField.value} value={crmField.value}>
                            {crmField.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum campo encontrado. Os campos serão detectados quando o primeiro lead chegar.
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
