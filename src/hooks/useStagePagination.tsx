import { useState, useMemo, useCallback } from 'react';

interface UseStagePaginationProps {
  leads: any[];
  leadsPerPage?: number;
}

export function useStagePagination({ leads, leadsPerPage = 20 }: UseStagePaginationProps) {
  const [loadedPages, setLoadedPages] = useState<Record<string, number>>({});

  const getVisibleLeads = useCallback((stageId: string, stageLeads: any[]) => {
    const pages = loadedPages[stageId] || 1;
    return stageLeads.slice(0, pages * leadsPerPage);
  }, [loadedPages, leadsPerPage]);

  const loadMoreLeads = useCallback((stageId: string) => {
    setLoadedPages(prev => ({
      ...prev,
      [stageId]: (prev[stageId] || 1) + 1
    }));
  }, []);

  const hasMoreLeads = useCallback((stageId: string, stageLeads: any[]) => {
    const pages = loadedPages[stageId] || 1;
    return stageLeads.length > pages * leadsPerPage;
  }, [loadedPages, leadsPerPage]);

  const resetPagination = useCallback((stageId?: string) => {
    if (stageId) {
      setLoadedPages(prev => ({ ...prev, [stageId]: 1 }));
    } else {
      setLoadedPages({});
    }
  }, []);

  return {
    getVisibleLeads,
    loadMoreLeads,
    hasMoreLeads,
    resetPagination
  };
}