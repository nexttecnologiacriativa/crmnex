import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDuplicateLeads, useBulkMergeLeads } from '@/hooks/useMergeLeads';
import { formatPhoneDisplay } from '@/lib/phone';
import MergeLeadsDialog from './MergeLeadsDialog';
import { Loader2, Users, Phone, AlertTriangle, Merge } from 'lucide-react';

interface DuplicateLeadsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DuplicateLeadsManager({ open, onOpenChange }: DuplicateLeadsManagerProps) {
  const { data: duplicateGroups = [], isLoading, refetch } = useDuplicateLeads();
  const bulkMerge = useBulkMergeLeads();
  const [selectedGroup, setSelectedGroup] = useState<typeof duplicateGroups[0] | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const totalDuplicates = duplicateGroups.reduce((acc, group) => acc + group.leads.length - 1, 0);

  const handleBulkMerge = async () => {
    setShowBulkConfirm(false);
    await bulkMerge.mutateAsync(duplicateGroups);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leads Duplicados
            </DialogTitle>
            <DialogDescription>
              {duplicateGroups.length > 0 
                ? `Encontrados ${duplicateGroups.length} grupos com ${totalDuplicates} leads duplicados`
                : 'Nenhum lead duplicado encontrado'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum lead com telefone duplicado</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  O lead mais recente de cada grupo será mantido
                </p>
                <Button
                  onClick={() => setShowBulkConfirm(true)}
                  disabled={bulkMerge.isPending}
                >
                  {bulkMerge.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Merge className="h-4 w-4 mr-2" />
                  )}
                  Mesclar Todos
                </Button>
              </div>

              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-3 pr-4">
                  {duplicateGroups.map((group) => (
                    <Card key={group.normalizedPhone} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatPhoneDisplay(group.leads[0].phone || '')}
                              </span>
                              <Badge variant="secondary">
                                {group.leads.length} leads
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              {group.leads.map((lead, index) => (
                                <Badge 
                                  key={lead.id} 
                                  variant={index === 0 ? "default" : "outline"} 
                                  className="text-xs"
                                >
                                  {lead.name}
                                  {index === 0 && ' ✓'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedGroup(group)}
                          >
                            Mesclar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {selectedGroup && (
        <MergeLeadsDialog
          open={!!selectedGroup}
          onOpenChange={(open) => !open && setSelectedGroup(null)}
          leads={selectedGroup.leads}
          onSuccess={() => {
            setSelectedGroup(null);
            refetch();
          }}
        />
      )}

      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mesclar todos os leads duplicados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá mesclar <strong>{duplicateGroups.length} grupos</strong> de duplicatas, 
              removendo <strong>{totalDuplicates} leads</strong>. 
              O lead mais recente de cada grupo será mantido e receberá os dados dos demais.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkMerge}>
              Mesclar Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
