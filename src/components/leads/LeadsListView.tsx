
import React, { useState } from 'react';
import { List, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadCardEnhanced from './LeadCardEnhanced';
import LeadsTable from './LeadsTable';
import LeadsPagination from './LeadsPagination';

interface LeadsListViewProps {
  filteredLeads: any[];
}

export default function LeadsListView({ filteredLeads }: LeadsListViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Calcular leads para a página atual
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset para primeira página
  };

  // Reset página quando filtros mudarem
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredLeads.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'gradient-premium text-white' : ''}
          >
            <Grid className="h-4 w-4 mr-1" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'gradient-premium text-white' : ''}
          >
            <List className="h-4 w-4 mr-1" />
            Lista
          </Button>
        </div>
        
        <div className="text-sm text-gray-600">
          {filteredLeads.length} lead(s) encontrado(s)
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentLeads.map((lead) => (
            <LeadCardEnhanced key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <LeadsTable leads={currentLeads} />
      )}

      {filteredLeads.length > 0 && (
        <LeadsPagination
          totalItems={filteredLeads.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}
