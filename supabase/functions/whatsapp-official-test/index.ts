
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, phone_number_id } = await req.json();

    if (!access_token || !phone_number_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Access token and phone number ID are required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test the WhatsApp API by making a request to get phone number info
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phone_number_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const responseData = await whatsappResponse.json();

    if (whatsappResponse.ok) {
      console.log('WhatsApp API test successful:', responseData);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: responseData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('WhatsApp API test failed:', responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.error?.message || 'Failed to connect to WhatsApp API' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
