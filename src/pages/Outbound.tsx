import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MapPin, Building, Phone, MessageCircle, UserPlus, ExternalLink, Settings, CheckCircle2, Mail } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { usePipelines } from '@/hooks/usePipeline';
import { useCreateLead } from '@/hooks/useLeads';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';
import { isBrazilianMobile } from '@/lib/phone';
import { useWhatsAppValidation } from '@/hooks/useWhatsAppValidation';

interface CompanyResult {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  category: string;
  rating?: number;
  reviews?: number;
  hasWhatsApp?: boolean;
}

export default function Outbound() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines } = usePipelines(currentWorkspace?.id);
  const createLead = useCreateLead();
  const { validateWhatsAppBatch, isValidating } = useWhatsAppValidation();

  // Serper API search function
  const searchCompanies = async () => {
    if (!searchQuery.trim()) {
      toast.error('Digite a categoria e cidade para pesquisar (ex: Restaurante em São Paulo)');
      return;
    }

    if (!apiKey.trim()) {
      toast.error('Configure sua API Key do Serper primeiro');
      setIsConfigDialogOpen(true);
      return;
    }

    setIsSearching(true);
    
    try {
      // Using Serper Google Places API
      const response = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: searchQuery,
          gl: 'br',
          hl: 'pt-br'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erro na busca');
      }
      
      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        let companies: CompanyResult[] = data.places.map((place: any, index: number) => ({
          id: place.placeId || `${place.title}-${index}`,
          name: place.title,
          address: place.address || 'Localização não informada',
          phone: place.phoneNumber,
          website: place.website,
          category: searchQuery.split(' em ')[0] || searchQuery,
          rating: place.rating,
          reviews: place.reviews
        }));
        
        // Validar WhatsApp apenas em celulares brasileiros
        // Enviar apenas os dígitos, sem adicionar DDI (a edge function fará isso)
        const phonesToValidate = companies
          .filter(c => c.phone && isBrazilianMobile(c.phone))
          .map(c => c.phone!.replace(/\D/g, '')); // Apenas remover caracteres não numéricos

        console.log('📱 Números para validação WhatsApp (apenas dígitos):', phonesToValidate);

        const validationResults = await validateWhatsAppBatch(phonesToValidate);

        // Marcar empresas com WhatsApp (comparar apenas os dígitos)
        const companiesWithWhatsApp = companies.map(company => {
          const companyDigits = company.phone?.replace(/\D/g, '') || '';
          const result = validationResults.find(
            r => r.phone.replace(/\D/g, '') === companyDigits
          );
          return {
            ...company,
            hasWhatsApp: result?.hasWhatsApp || false
          };
        });

        setResults(companiesWithWhatsApp);
        
        const withWhatsApp = companiesWithWhatsApp.filter(c => c.hasWhatsApp).length;
        const total = companiesWithWhatsApp.length;
        
        toast.success(`${total} empresas encontradas (${withWhatsApp} com WhatsApp ativo)`);
      } else {
        setResults([]);
        toast.info('Nenhuma empresa encontrada para esta busca');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar empresas. Verifique sua API Key.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfigSave = () => {
    if (!apiKey.trim()) {
      toast.error('Digite uma API Key válida');
      return;
    }
    
    localStorage.setItem('serper-api-key', apiKey);
    toast.success('API Key configurada com sucesso!');
    setIsConfigDialogOpen(false);
  };

  // Load API key from localStorage on component mount
  const loadApiKey = () => {
    const savedApiKey = localStorage.getItem('serper-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  };

  // Load API key when component mounts
  useEffect(() => {
    loadApiKey();
  }, []);

  const openLeadDialog = (company: CompanyResult) => {
    setSelectedCompany(company);
    setSelectedPipeline('');
    setIsLeadDialogOpen(true);
  };

  const handleCreateLead = async () => {
    if (!currentWorkspace || !selectedPipeline || !selectedCompany) {
      toast.error('Selecione um pipeline');
      return;
    }

    const pipeline = pipelines?.find(p => p.id === selectedPipeline);
    if (!pipeline || !pipeline.pipeline_stages?.[0]) {
      toast.error('Pipeline inválido');
      return;
    }

    try {
      await createLead.mutateAsync({
        name: selectedCompany.name,
        email: '',
        phone: selectedCompany.phone || '',
        company: selectedCompany.name,
        workspace_id: currentWorkspace.id,
        pipeline_id: selectedPipeline,
        stage_id: pipeline.pipeline_stages[0].id,
        assigned_to: currentWorkspace.owner_id,
        currency: 'BRL',
        status: 'new' as const,
        source: 'outbound',
        notes: `Empresa encontrada via busca: ${selectedCompany.address}${selectedCompany.website ? ` - Website: ${selectedCompany.website}` : ''}`
      });

      toast.success(`Lead ${selectedCompany.name} criado com sucesso!`);
      setIsLeadDialogOpen(false);
      setSelectedCompany(null);
    } catch (error) {
      toast.error('Erro ao criar lead');
    }
  };

  const handleStartConversation = (company: CompanyResult) => {
    // Armazenar dados da empresa no sessionStorage para a nova janela
    const outboundData = {
      companyName: company.name,
      companyPhone: company.phone,
      companyAddress: company.address,
      source: 'outbound'
    };
    sessionStorage.setItem('outbound-conversation', JSON.stringify(outboundData));
    
    // Abrir em nova aba
    window.open('/atendimento?from=outbound', '_blank');
    
    toast.success(`Abrindo conversa com ${company.name} em nova aba`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" key="outbound-main">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexcrm-green">Outbound</h1>
            <p className="text-muted-foreground mt-1">
              Encontre e conecte-se com empresas potenciais
            </p>
          </div>
          <div className="flex items-center gap-3">
            {apiKey && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                API Configurada
              </div>
            )}
            <Button
              onClick={() => setIsConfigDialogOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar API
            </Button>
          </div>
        </div>

        {/* Search Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-nexcrm-blue/10 to-nexcrm-green/10">
            <CardTitle className="text-nexcrm-blue">Buscar Empresas</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <Input
                  placeholder="Digite a categoria e a cidade (ex: Restaurante em Cruzeiro, São Paulo)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <Button 
                  onClick={searchCompanies}
                  disabled={isSearching || isValidating}
                  className="w-full gradient-premium text-white"
                >
                  {isSearching || isValidating ? (
                    <>{isValidating ? 'Validando WhatsApp...' : 'Buscando...'}</>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {results.length} empresas encontradas
              </h2>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-600">
                  {results.filter(r => r.hasWhatsApp).length} com WhatsApp
                </Badge>
                <Badge variant="outline">
                  {results.filter(r => !r.hasWhatsApp && r.phone).length} outros contatos
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((company) => (
                <Card key={company.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                          {company.hasWhatsApp ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              WhatsApp
                            </Badge>
                          ) : company.phone && isBrazilianMobile(company.phone) ? (
                            <Badge variant="outline" className="border-orange-500 text-orange-700">
                              <Phone className="h-3 w-3 mr-1" />
                              Celular s/ WhatsApp
                            </Badge>
                          ) : company.phone ? (
                            <Badge variant="outline" className="border-blue-500 text-blue-700">
                              <Phone className="h-3 w-3 mr-1" />
                              Telefone Fixo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Mail className="h-3 w-3 mr-1" />
                              Email disponível
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="mb-2">
                          {company.category}
                        </Badge>
                      </div>
                      {company.rating && (
                        <div className="text-right">
                          <div className="text-sm font-medium">⭐ {company.rating}</div>
                          <div className="text-xs text-muted-foreground">
                            {company.reviews} avaliações
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{company.address}</span>
                      </div>
                      
                      {company.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                      
                      {company.website && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`https://${company.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>

                    {!company.hasWhatsApp && company.phone && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-xs text-amber-800 font-medium">
                          ⚠️ Cliente sem WhatsApp ativo
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Faça a prospecção por telefone ou e-mail
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => openLeadDialog(company)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Lead
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartConversation(company)}
                        disabled={!company.hasWhatsApp}
                        className={
                          company.hasWhatsApp 
                            ? "text-green-600 border-green-600 hover:bg-green-50"
                            : "opacity-50 cursor-not-allowed"
                        }
                        title={!company.hasWhatsApp ? "WhatsApp não disponível" : ""}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Fale
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lead Creation Dialog */}
        <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Lead - {selectedCompany?.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Selecione o Pipeline
                </label>
                <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um pipeline" />
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

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsLeadDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateLead}
                  disabled={!selectedPipeline || createLead.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createLead.isPending ? 'Criando...' : 'Criar Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* API Configuration Dialog */}
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Serper API</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  API Key do Serper
                </label>
                <Input
                  type="password"
                  placeholder="Cole sua API Key aqui"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sua API Key será salva localmente no navegador
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Para obter sua API Key:</p>
                <p>1. Acesse serper.dev</p>
                <p>2. Crie uma conta gratuita</p>
                <p>3. Copie sua API Key do dashboard</p>
                <p>4. Cole aqui para começar a usar</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsConfigDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfigSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Salvar Configuração
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {!isSearching && results.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma busca realizada</h3>
              <p className="text-muted-foreground">
                {apiKey 
                  ? 'Digite uma categoria e cidade para encontrar empresas potenciais' 
                  : 'Configure sua API Key para começar a buscar empresas'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}