
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit, Save, X } from 'lucide-react';

interface EditJobStatusColumnProps {
  status: 'todo' | 'in_progress' | 'review' | 'done' | string;
  label: string;
  color?: string;
  onSave?: (newLabel: string) => void;
  isCustom?: boolean;
}

const statusLabels = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso', 
  review: 'Em Revisão',
  done: 'Concluído',
};

const statusColors = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  review: '#f59e0b', 
  done: '#10b981',
};

export default function EditJobStatusColumn({ status, label, color, onSave, isCustom }: EditJobStatusColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label || statusLabels[status as keyof typeof statusLabels] || status);

  const handleSave = () => {
    if (editValue.trim() && onSave) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(label || statusLabels[status as keyof typeof statusLabels] || status);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayColor = color || statusColors[status as keyof typeof statusColors] || '#6b7280';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="text-sm font-medium"
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className="h-6 w-6 p-0"
        >
          <Save className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      <div 
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: displayColor }}
      />
      <span className="font-medium text-gray-900">
        {label || statusLabels[status as keyof typeof statusLabels] || status}
      </span>
      {(isCustom || onSave) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
