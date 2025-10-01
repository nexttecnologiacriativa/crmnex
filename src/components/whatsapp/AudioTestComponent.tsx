import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AudioPlayer from './AudioPlayer';

export default function AudioTestComponent() {
  const [testUrls] = useState([
    {
      name: 'Permanent URL Test',
      permanentUrl: 'https://mqotdnvwyjhyiqzbefpm.supabase.co/storage/v1/object/public/whatsapp-audio/3908375f-3b6b-4c64-be2b-9dd2cdc99396/audio/1755030955614_6f64343e-fee6-4228-b696-5eff19c821a5.ogg',
      audioUrl: null,
    },
    {
      name: 'Temporary URL Test',
      permanentUrl: null,
      audioUrl: 'https://mmg.whatsapp.net/v/t62.7117-24/532981135_732589452955877_9135270430880878876_n.enc?ccb=11-4&oh=01_Q5Aa2QEkPV_eM8rrVbr0s1HdUKmAuv8UwA91na0B5TklSz-7Pg&oe=68C2FFE0&_nc_sid=5e03e0&mms3=true',
    }
  ]);

  const testStorageAccess = async () => {
    const testUrl = 'https://mqotdnvwyjhyiqzbefpm.supabase.co/storage/v1/object/public/whatsapp-audio/3908375f-3b6b-4c64-be2b-9dd2cdc99396/audio/1755030955614_6f64343e-fee6-4228-b696-5eff19c821a5.ogg';
    
    try {
      const response = await fetch(testUrl, { method: 'HEAD' });
      console.log('🔧 Storage access test:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      console.error('❌ Storage access error:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Teste de Áudio - Diagnóstico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testStorageAccess} variant="outline">
          Testar Acesso ao Storage
        </Button>
        
        {testUrls.map((test, index) => (
          <div key={index} className="border p-4 rounded">
            <h3 className="font-semibold mb-2">{test.name}</h3>
            <AudioPlayer
              audioUrl={test.audioUrl || test.permanentUrl || ''}
              permanentUrl={test.permanentUrl || undefined}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}