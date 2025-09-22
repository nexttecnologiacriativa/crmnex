import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { workspaceId, instanceName, newInstanceName } = await req.json();
    
    console.log('🔄 Migration request:', { workspaceId, instanceName, newInstanceName });

    if (!workspaceId) {
      throw new Error('workspaceId é obrigatório');
    }

    // Generate workspace prefix for security
    const workspacePrefix = `ws_${workspaceId.substring(0, 8)}_`;
    
    if (instanceName && newInstanceName) {
      // Migrate specific instance
      if (!newInstanceName.startsWith(workspacePrefix)) {
        throw new Error(`Novo nome deve começar com ${workspacePrefix} para segurança`);
      }
      
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .update({ 
          instance_name: newInstanceName,
          instance_key: newInstanceName,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .eq('instance_name', instanceName)
        .select();
        
      if (error) throw error;
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Instância ${instanceName} migrada para ${newInstanceName}`,
        data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Migrate all instances in workspace that don't have prefix
    const { data: instances, error: fetchError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('workspace_id', workspaceId);
      
    if (fetchError) throw fetchError;
    
    const migratedInstances = [];
    const errors = [];
    
    for (const instance of instances || []) {
      // Skip instances that already have workspace prefix
      if (instance.instance_name.startsWith(workspacePrefix)) {
        console.log(`⚪ Instance ${instance.instance_name} already has correct prefix`);
        continue;
      }
      
      // Generate new name with prefix
      const oldName = instance.instance_name;
      const newName = `${workspacePrefix}${oldName}`;
      
      try {
        console.log(`🔄 Migrating ${oldName} to ${newName}`);
        
        const { error: updateError } = await supabase
          .from('whatsapp_instances')
          .update({ 
            instance_name: newName,
            instance_key: newName,
            updated_at: new Date().toISOString()
          })
          .eq('id', instance.id);
          
        if (updateError) {
          console.error(`❌ Failed to migrate ${oldName}:`, updateError);
          errors.push(`Failed to migrate ${oldName}: ${updateError.message}`);
        } else {
          console.log(`✅ Migrated ${oldName} to ${newName}`);
          migratedInstances.push({ oldName, newName });
        }
      } catch (error) {
        console.error(`❌ Exception migrating ${oldName}:`, error);
        errors.push(`Exception migrating ${oldName}: ${error.message}`);
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Migração concluída: ${migratedInstances.length} instâncias migradas`,
      migratedInstances,
      errors,
      workspaceId,
      workspacePrefix
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});