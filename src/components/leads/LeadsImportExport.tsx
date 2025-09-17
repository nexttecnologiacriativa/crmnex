import { useState, useRef } from 'react';
import { Download, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLeads, useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePipelines } from '@/hooks/usePipeline';
import { useLeadTags, useCreateLeadTag, useAddTagToLead } from '@/hooks/useLeadTags';
import { toast } from 'sonner';

interface LeadsImportExportProps {
  leads: any[];
}

interface FieldMapping {
  csvColumn: string;
  leadField: string;
}

export default function LeadsImportExport({ leads }: LeadsImportExportProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'pipeline'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines } = usePipelines(currentWorkspace?.id);
  const { data: existingLeads = [] } = useLeads();
  const { data: allTags = [] } = useLeadTags();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const createTag = useCreateLeadTag();
  const addTagToLead = useAddTagToLead();

  const leadFieldOptions = [
    { value: 'none', label: 'Não mapear' },
    { value: 'name', label: 'Nome' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'company', label: 'Empresa' },
    { value: 'position', label: 'Cargo' },
    { value: 'value', label: 'Valor' },
    { value: 'notes', label: 'Notas' },
    { value: 'source', label: 'Origem' },
    { value: 'utm_source', label: 'UTM Source' },
    { value: 'utm_medium', label: 'UTM Medium' },
    { value: 'utm_campaign', label: 'UTM Campaign' },
  ];

  const handleExport = () => {
    const exportData = leads.map(lead => ({
      nome: lead.name?.charAt(0).toUpperCase() + lead.name?.slice(1).toLowerCase() || "",
      email: lead.email || '',
      telefone: lead.phone || '',
      empresa: lead.company || '',
      cargo: lead.position || '',
      valor: lead.value || '',
      notas: lead.notes || '',
      origem: lead.source || '',
      utm_source: lead.utm_source || '',
      utm_medium: lead.utm_medium || '',
      utm_campaign: lead.utm_campaign || '',
      data_criacao: new Date(lead.created_at).toLocaleDateString('pt-BR')
    }));

    const headers = [
      'nome',
      'email', 
      'telefone',
      'empresa',
      'cargo',
      'valor',
      'notas',
      'origem',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'data_criacao'
    ];

    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Leads exportados com sucesso!');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast.error('Arquivo CSV vazio');
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const dataLines = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.replace(/"/g, '').trim())
      );

      setCsvHeaders(headers);
      setCsvData(dataLines);
      setFieldMappings(headers.map(header => ({ csvColumn: header, leadField: 'none' })));
      setStep('mapping');
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      toast.error('Erro ao processar arquivo CSV');
    }
  };

  const handleMappingChange = (index: number, leadField: string) => {
    const newMappings = [...fieldMappings];
    newMappings[index].leadField = leadField;
    setFieldMappings(newMappings);
  };

  const handleProceedToMapping = () => {
    if (!csvHeaders.length) {
      toast.error('Primeiro faça upload de um arquivo CSV');
      return;
    }
    setStep('pipeline');
  };

  const findExistingLead = (leadData: any) => {
    return existingLeads.find(lead => {
      // Verificar por email se ambos existirem
      if (leadData.email && lead.email && leadData.email.toLowerCase() === lead.email.toLowerCase()) {
        return true;
      }
      
      // Verificar por telefone se ambos existirem (removendo formatação)
      if (leadData.phone && lead.phone) {
        const cleanNewPhone = leadData.phone.replace(/\D/g, '');
        const cleanExistingPhone = lead.phone.replace(/\D/g, '');
        if (cleanNewPhone && cleanExistingPhone && cleanNewPhone === cleanExistingPhone) {
          return true;
        }
      }
      
      return false;
    });
  };

  const getOrCreateImportTag = async () => {
    // Verificar se a tag "Importação" já existe
    let importTag = allTags.find(tag => tag.name.toLowerCase() === 'importação');
    
    if (!importTag) {
      // Criar a tag "Importação" se não existir
      importTag = await createTag.mutateAsync({
        name: 'Importação',
        color: '#10b981' // Verde
      });
    }
    
    return importTag;
  };

  const handleImport = async () => {
    if (!currentWorkspace || !pipelines?.length || !selectedPipeline) {
      toast.error('Selecione um pipeline');
      return;
    }

    const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);
    const defaultStage = selectedPipelineData?.pipeline_stages?.[0];

    if (!defaultStage) {
      toast.error('Estágio padrão não encontrado');
      return;
    }

    setIsProcessing(true);

    try {
      // Obter ou criar a tag "Importação"
      const importTag = await getOrCreateImportTag();
      
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (const row of csvData) {
        try {
          const leadData: any = {};

          fieldMappings.forEach((mapping, index) => {
            if (mapping.leadField && mapping.leadField !== 'none' && row[index]) {
              const value = row[index];
              switch (mapping.leadField) {
                case 'value':
                  leadData.value = value ? parseFloat(value) : null;
                  break;
                default:
                  leadData[mapping.leadField] = value || null;
              }
            }
          });

          if (leadData.name) {
            // Se utm_source estiver vazio, definir como "Importação"
            if (!leadData.utm_source) {
              leadData.utm_source = 'Importação';
            }

            // Se value não foi definido ou é null, herdar do pipeline
            if (!leadData.value && selectedPipelineData?.default_value) {
              leadData.value = selectedPipelineData.default_value;
            }

            // Verificar se o lead já existe
            const existingLead = findExistingLead(leadData);

            let leadId: string;

            if (existingLead) {
              // Atualizar lead existente
              await updateLead.mutateAsync({
                id: existingLead.id,
                ...leadData
              });
              leadId = existingLead.id;
              updatedCount++;
            } else {
              // Criar novo lead
              const newLead = await createLead.mutateAsync({
                workspace_id: currentWorkspace.id,
                pipeline_id: selectedPipeline,
                stage_id: defaultStage.id,
                assigned_to: currentWorkspace.owner_id,
                currency: 'BRL',
                status: 'new' as const,
                ...leadData
              });
              leadId = newLead.id;
              createdCount++;
            }

            // Adicionar tag "Importação" ao lead
            try {
              await addTagToLead.mutateAsync({
                leadId,
                tagId: importTag.id
              });
            } catch (tagError) {
              // Se der erro ao adicionar tag (provavelmente já existe), continuar
              console.log('Tag já existe no lead ou erro ao adicionar:', tagError);
            }
          }
        } catch (error) {
          console.error('Erro ao processar linha:', error);
          errorCount++;
        }
      }

      const successMessage = `Importação concluída! ${createdCount} leads criados, ${updatedCount} leads atualizados${errorCount > 0 ? `, ${errorCount} erros` : ''}`;
      toast.success(successMessage);
      setIsImportDialogOpen(false);
      resetImportState();
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao processar arquivo CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImportState = () => {
    setStep('upload');
    setCsvHeaders([]);
    setFieldMappings([]);
    setSelectedPipeline('');
    setCsvData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      'nome,email,telefone,empresa,cargo,valor,notas,origem,utm_source,utm_medium,utm_campaign',
      '"João Silva","joao@example.com","(11) 99999-9999","Empresa XYZ","Gerente","5000","Lead interessado","Website","google","cpc","campanha-teste"'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_importacao_leads.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        onClick={handleExport}
        variant="outline"
        size="sm"
        disabled={leads.length === 0}
      >
        <Download className="h-4 w-4 mr-1" />
        Exportar
      </Button>

      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) resetImportState();
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Leads</DialogTitle>
          </DialogHeader>
          
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Faça upload de um arquivo CSV com seus leads.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={downloadTemplate}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Baixar Template
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv-file">Arquivo CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </div>

              {csvHeaders.length > 0 && (
                <div className="pt-4">
                  <Button onClick={handleProceedToMapping} className="w-full">
                    Continuar para Mapeamento
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Mapeie as colunas do seu CSV para os campos do lead:</p>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3">
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-1/2">
                      <Label className="text-xs text-gray-500">Coluna CSV</Label>
                      <div className="p-2 bg-gray-50 rounded text-sm">{mapping.csvColumn}</div>
                    </div>
                    <div className="w-1/2">
                      <Label className="text-xs text-gray-500">Campo Lead</Label>
                      <Select
                        value={mapping.leadField || 'none'}
                        onValueChange={(value) => handleMappingChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {leadFieldOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Voltar
                </Button>
                <Button onClick={() => setStep('pipeline')} className="flex-1">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'pipeline' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Selecione o pipeline onde os leads serão importados:</p>
              </div>

              <div className="space-y-2">
                <Label>Pipeline</Label>
                <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines?.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Voltar
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={!selectedPipeline || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Importando...' : 'Importar Leads'}
                </Button>
              </div>

              {isProcessing && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexcrm-blue mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Processando arquivo...</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
