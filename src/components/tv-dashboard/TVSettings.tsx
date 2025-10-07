import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TVSettingsProps {
  onClose: () => void;
}

export default function TVSettings({ onClose }: TVSettingsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Configurações do Dashboard TV</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Configurações personalizáveis em desenvolvimento...
        </p>
      </CardContent>
    </Card>
  );
}
