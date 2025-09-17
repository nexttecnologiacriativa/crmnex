
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, MoreHorizontal, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useJobBoards, useDeleteJobBoard, useUpdateJobBoard } from '@/hooks/useJobs';
import CreateJobBoardDialog from './CreateJobBoardDialog';
import EditJobBoardDialog from './EditJobBoardDialog';

interface JobBoardSelectorProps {
  selectedBoardId: string | null;
  onBoardSelect: (boardId: string | null) => void;
}

export default function JobBoardSelector({
  selectedBoardId,
  onBoardSelect
}: JobBoardSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const {
    data: boards = []
  } = useJobBoards();
  const deleteBoard = useDeleteJobBoard();
  const updateBoard = useUpdateJobBoard();

  const handleDeleteBoard = async (boardId: string) => {
    if (selectedBoardId === boardId) {
      onBoardSelect(null);
    }
    await deleteBoard.mutateAsync(boardId);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(boards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualizar as posições no banco de dados
    const updates = items.map((board, index) => ({
      id: board.id,
      position: index
    }));

    // Aqui você pode implementar uma função para atualizar as posições em lote
    // Por simplicidade, vamos atualizar uma por vez
    try {
      for (const update of updates) {
        await updateBoard.mutateAsync(update);
      }
    } catch (error) {
      console.error('Erro ao reordenar boards:', error);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={selectedBoardId === null ? "default" : "outline"}
          size="sm"
          onClick={() => onBoardSelect(null)}
          className="flex items-center gap-2"
        >
          Todos os Jobs
        </Button>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="boards" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex items-center gap-2"
              >
                {boards.map((board, index) => (
                  <Draggable key={board.id} draggableId={board.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-1 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center">
                          <div
                            {...provided.dragHandleProps}
                            className="flex items-center justify-center w-4 h-6 text-gray-400 hover:text-gray-600 cursor-grab"
                          >
                            <GripVertical className="h-3 w-3" />
                          </div>
                          <Button
                            variant={selectedBoardId === board.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => onBoardSelect(board.id)}
                            style={{
                              backgroundColor: selectedBoardId === board.id ? board.color : undefined,
                              borderColor: board.color
                            }}
                            className="flex items-center gap-2 ml-1 text-center"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: selectedBoardId === board.id ? 'white' : board.color
                              }}
                            />
                            {board.name}
                          </Button>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingBoard(board)}>
                              <Edit className="h-3 w-3 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Board</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir este board? Todos os jobs do board serão movidos para "Sem Board".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteBoard(board.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-3 w-3" />
          Novo Board
        </Button>
      </div>

      <CreateJobBoardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {editingBoard && (
        <EditJobBoardDialog
          board={editingBoard}
          open={!!editingBoard}
          onOpenChange={() => setEditingBoard(null)}
        />
      )}
    </>
  );
}
