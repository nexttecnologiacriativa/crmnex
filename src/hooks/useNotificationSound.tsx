import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  workspace_id?: string;
  whatsapp_sound_enabled: boolean;
  whatsapp_sound_type: string;
  lead_sound_enabled: boolean;
  lead_sound_type: string;
  created_at?: string;
  updated_at?: string;
}

export const SOUND_OPTIONS = [
  { id: 'notification-1', name: '🔔 Sino', frequency: 800, type: 'sine' as OscillatorType, duration: 0.2 },
  { id: 'notification-2', name: '💬 Pop', frequency: 600, type: 'square' as OscillatorType, duration: 0.15 },
  { id: 'notification-3', name: '📱 Digital', frequency: 1000, type: 'sine' as OscillatorType, duration: 0.1 },
  { id: 'notification-4', name: '🎵 Campainha', frequency: 523.25, type: 'sine' as OscillatorType, duration: 0.3 },
  { id: 'notification-5', name: '🔕 Discreto', frequency: 440, type: 'triangle' as OscillatorType, duration: 0.12 },
];

export function useNotificationSound() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Buscar configurações
  const { data: settings } = useQuery({
    queryKey: ['notification-settings', user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspace.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as NotificationSettings | null;
    },
    enabled: !!user?.id && !!currentWorkspace?.id
  });

  // Atualizar configurações
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      if (!user?.id || !currentWorkspace?.id) throw new Error('User or workspace not found');

      const { data, error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          workspace_id: currentWorkspace.id,
          ...newSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,workspace_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as NotificationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    }
  });

  // Tocar som usando Web Audio API
  const playGeneratedSound = (soundType: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      const soundConfig = SOUND_OPTIONS.find(s => s.id === soundType);
      if (!soundConfig) return;
      
      oscillator.type = soundConfig.type;
      oscillator.frequency.setValueAtTime(soundConfig.frequency, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + soundConfig.duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + soundConfig.duration);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Tocar som de notificação
  const playSound = (type: 'whatsapp' | 'lead') => {
    if (!settings) return;
    
    const isEnabled = type === 'whatsapp' 
      ? settings.whatsapp_sound_enabled 
      : settings.lead_sound_enabled;
    
    const soundType = type === 'whatsapp' 
      ? settings.whatsapp_sound_type 
      : settings.lead_sound_type;
    
    if (!isEnabled) return;
    
    playGeneratedSound(soundType);
  };

  // Testar som específico
  const testSound = (soundType: string) => {
    playGeneratedSound(soundType);
  };

  return {
    settings,
    updateSettings,
    playSound,
    testSound,
    soundOptions: SOUND_OPTIONS,
    isWhatsAppEnabled: settings?.whatsapp_sound_enabled || false,
    isLeadEnabled: settings?.lead_sound_enabled || false
  };
}
