import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  console.log('🧪 Test webhook called');
  console.log('📍 Method:', req.method);
  console.log('🌐 URL:', req.url);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log request body
    let body = '';
    if (req.method === 'POST') {
      body = await req.text();
      console.log('📄 Request body:', body);
    }

    // Always return success for testing
    const response = {
      success: true,
      status: 'ok',
      message: 'Webhook de teste funcionando corretamente',
      data: {
        timestamp: new Date().toISOString(),
        method: req.method,
        body: body || 'empty',
        url: req.url
      }
    };

    console.log('✅ Returning success response');
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('❌ Error in test webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Test webhook error',
        message: error.message
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );
  }
});