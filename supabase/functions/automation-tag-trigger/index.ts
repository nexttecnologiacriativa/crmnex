import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, tag_id, workspace_id } = await req.json();
    
    console.log('🏷️ Tag applied trigger:', { 
      lead_id, 
      tag_id, 
      workspace_id 
    });

    // Chamar a automation engine para processar
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/automation-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        action: 'process_tag_applied',
        lead_id,
        tag_id,
        workspace_id
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to process automation');
    }

    console.log('✅ Automation processed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Tag trigger error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process tag trigger', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});