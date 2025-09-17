import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Debriefing {
  id: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  project_name: string;
  campaign_type: string;
  start_date?: string;
  end_date?: string;
  responsible?: string;
  what_happened?: string;
  what_worked?: string;
  what_could_improve?: string;
  next_steps?: string;
  total_investment?: number;
  gross_revenue?: number;
  net_revenue?: number;
  leads_captured?: number;
  sales_made?: number;
  page_url?: string;
  total_views?: number;
  unique_visitors?: number;
  cta_clicks?: number;
  conversions?: number;
  avg_time_on_page?: number;
  predominant_device?: string;
  predominant_traffic_source?: string;
  checkout_views?: number;
  checkout_starts?: number;
  checkout_abandonments?: number;
  completed_purchases?: number;
  abandonment_reasons?: string;
  checkout_platform?: string;
}

export interface DebriefingAd {
  id: string;
  debriefing_id: string;
  created_at: string;
  ad_name: string;
  ad_type: string;
  platform: string;
  campaign_objective: string;
  view_link?: string;
  total_spent?: number;
  leads_generated?: number;
  sales_generated?: number;
  ctr?: number;
  cpm?: number;
  cpc?: number;
  observations?: string;
  performance_rating?: number;
  creative_file_url?: string;
}

export const useDebriefings = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: debriefings, isLoading } = useQuery({
    queryKey: ['debriefings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('debriefings')
        .select(`
          *,
          profiles!debriefings_created_by_fkey(full_name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Debriefing[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createDebriefing = useMutation({
    mutationFn: async (data: Partial<Debriefing> & { project_name: string; campaign_type: string }) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error('Workspace ou usuário não encontrado');
      }

      const { data: result, error } = await supabase
        .from('debriefings')
        .insert({
          ...data,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefings'] });
      toast({
        title: "Debriefing criado",
        description: "O debriefing foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar debriefing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDebriefing = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Debriefing> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('debriefings')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefings'] });
      toast({
        title: "Debriefing atualizado",
        description: "O debriefing foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar debriefing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDebriefing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debriefings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefings'] });
      toast({
        title: "Debriefing excluído",
        description: "O debriefing foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir debriefing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    debriefings: debriefings || [],
    isLoading,
    createDebriefing,
    updateDebriefing,
    deleteDebriefing,
  };
};

// Interfaces para as novas funcionalidades
export interface DebriefingSettings {
  id: string;
  workspace_id: string;
  fixed_cost: number;
  tax_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  default_price: number;
  created_at: string;
  updated_at: string;
}

export interface DebriefingProduct {
  id: string;
  debriefing_id: string;
  product_id: string;
  unit_price: number;
  quantity_sold: number;
  total_revenue: number;
  created_at: string;
  product?: Product;
}

export interface DebriefingPage {
  id: string;
  debriefing_id: string;
  name: string;
  page_url?: string;
  total_views: number;
  unique_visitors: number;
  cta_clicks: number;
  conversions: number;
  conversion_rate: number;
  avg_time_on_page: number;
  predominant_device?: string;
  predominant_traffic_source?: string;
  created_at: string;
}

export const useDebriefingSettings = () => {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['debriefing-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('debriefing_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DebriefingSettings | null;
    },
    enabled: !!currentWorkspace?.id,
  });

  const saveSettings = useMutation({
    mutationFn: async (data: { fixed_cost: number; tax_percentage: number }) => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace não encontrado');
      }

      const { data: result, error } = await supabase
        .from('debriefing_settings')
        .upsert({
          workspace_id: currentWorkspace.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-settings'] });
      toast({
        title: "Configurações salvas",
        description: "As configurações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    saveSettings,
  };
};

export const useProducts = () => {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createProduct = useMutation({
    mutationFn: async (data: { name: string; default_price: number }) => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace não encontrado');
      }

      const { data: result, error } = await supabase
        .from('products')
        .insert({
          ...data,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Produto criado",
        description: "O produto foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async (data: { id: string; name: string; default_price: number }) => {
      const { data: result, error } = await supabase
        .from('products')
        .update({
          name: data.name,
          default_price: data.default_price,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    products: products || [],
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

export const useDebriefingProducts = (debriefingId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['debriefing-products', debriefingId],
    queryFn: async () => {
      if (!debriefingId) return [];

      const { data, error } = await supabase
        .from('debriefing_products')
        .select('*')
        .eq('debriefing_id', debriefingId);

      if (error) throw error;
      return data as DebriefingProduct[];
    },
    enabled: !!debriefingId,
  });

  const addProduct = useMutation({
    mutationFn: async (data: {
      product_id: string;
      unit_price: number;
      quantity_sold: number;
    }) => {
      const { data: result, error } = await supabase
        .from('debriefing_products')
        .insert({
          debriefing_id: debriefingId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-products', debriefingId] });
      toast({
        title: "Produto adicionado",
        description: "O produto foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debriefing_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-products', debriefingId] });
      toast({
        title: "Produto removido",
        description: "O produto foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, unit_price, quantity_sold }: { id: string; unit_price: number; quantity_sold: number }) => {
      const total_revenue = unit_price * quantity_sold;
      
      const { data: result, error } = await supabase
        .from('debriefing_products')
        .update({
          unit_price,
          quantity_sold,
          total_revenue,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-products', debriefingId] });
      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    products: products || [],
    isLoading,
    addProduct,
    removeProduct,
    updateProduct,
  };
};

export const useDebriefingPages = (debriefingId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ['debriefing-pages', debriefingId],
    queryFn: async () => {
      if (!debriefingId) return [];

      const { data, error } = await supabase
        .from('debriefing_pages')
        .select('*')
        .eq('debriefing_id', debriefingId)
        .order('created_at');

      if (error) throw error;
      return data as DebriefingPage[];
    },
    enabled: !!debriefingId,
  });

  const addPage = useMutation({
    mutationFn: async (data: Omit<DebriefingPage, 'id' | 'debriefing_id' | 'created_at' | 'conversion_rate'>) => {
      const { data: result, error } = await supabase
        .from('debriefing_pages')
        .insert({
          debriefing_id: debriefingId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-pages', debriefingId] });
      toast({
        title: "Página adicionada",
        description: "A página foi adicionada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar página",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DebriefingPage> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('debriefing_pages')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-pages', debriefingId] });
      toast({
        title: "Página atualizada",
        description: "A página foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar página",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debriefing_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-pages', debriefingId] });
      toast({
        title: "Página removida",
        description: "A página foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover página",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    pages: pages || [],
    isLoading,
    addPage,
    updatePage,
    removePage,
  };
};

export const useDebriefingAds = (debriefingId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ads, isLoading } = useQuery({
    queryKey: ['debriefing-ads', debriefingId],
    queryFn: async () => {
      if (!debriefingId) return [];

      const { data, error } = await supabase
        .from('debriefing_ads')
        .select('*')
        .eq('debriefing_id', debriefingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DebriefingAd[];
    },
    enabled: !!debriefingId,
  });

  const createAd = useMutation({
    mutationFn: async (data: Omit<DebriefingAd, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('debriefing_ads')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-ads', debriefingId] });
      toast({
        title: "Anúncio adicionado",
        description: "O anúncio foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar anúncio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DebriefingAd> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('debriefing_ads')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-ads', debriefingId] });
      toast({
        title: "Anúncio atualizado",
        description: "O anúncio foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar anúncio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debriefing_ads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-ads', debriefingId] });
      toast({
        title: "Anúncio excluído",
        description: "O anúncio foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir anúncio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    ads: ads || [],
    isLoading,
    createAd,
    updateAd,
    deleteAd,
  };
};

// Interfaces para checkouts
export interface DebriefingCheckout {
  id: string;
  debriefing_id: string;
  product_id?: string;
  name: string;
  checkout_url?: string;
  platform?: string;
  total_views: number;
  checkout_starts: number;
  checkout_abandonments: number;
  completed_purchases: number;
  conversion_rate: number;
  abandonment_rate: number;
  created_at: string;
  updated_at: string;
}

export const useDebriefingCheckouts = (debriefingId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checkouts, isLoading } = useQuery({
    queryKey: ['debriefing-checkouts', debriefingId],
    queryFn: async () => {
      if (!debriefingId) return [];

      const { data, error } = await supabase
        .from('debriefing_checkouts')
        .select('*')
        .eq('debriefing_id', debriefingId)
        .order('created_at');

      if (error) throw error;
      return data as DebriefingCheckout[];
    },
    enabled: !!debriefingId,
  });

  const createCheckout = useMutation({
    mutationFn: async (data: {
      name: string;
      checkout_url?: string;
      platform?: string;
      product_id?: string;
      total_views: number;
      checkout_starts: number;
      checkout_abandonments: number;
      completed_purchases: number;
    }) => {
      const { data: result, error } = await supabase
        .from('debriefing_checkouts')
        .insert({
          ...data,
          debriefing_id: debriefingId,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-checkouts'] });
      toast({
        title: "Checkout adicionado",
        description: "O checkout foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar checkout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCheckout = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      checkout_url?: string;
      platform?: string;
      product_id?: string;
      total_views: number;
      checkout_starts: number;
      checkout_abandonments: number;
      completed_purchases: number;
    }) => {
      const { data: result, error } = await supabase
        .from('debriefing_checkouts')
        .update({
          name: data.name,
          checkout_url: data.checkout_url,
          platform: data.platform,
          product_id: data.product_id,
          total_views: data.total_views,
          checkout_starts: data.checkout_starts,
          checkout_abandonments: data.checkout_abandonments,
          completed_purchases: data.completed_purchases,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-checkouts'] });
      toast({
        title: "Checkout atualizado",
        description: "O checkout foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar checkout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCheckout = useMutation({
    mutationFn: async (checkoutId: string) => {
      const { error } = await supabase
        .from('debriefing_checkouts')
        .delete()
        .eq('id', checkoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debriefing-checkouts'] });
      toast({
        title: "Checkout removido",
        description: "O checkout foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover checkout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    checkouts: checkouts || [],
    isLoading,
    createCheckout,
    updateCheckout,
    deleteCheckout,
  };
};