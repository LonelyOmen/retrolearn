import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const notificationApiSecret = Deno.env.get('NOTIFICATIONAPI_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !notificationApiSecret) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const { action, roomId, message, userId, clientId } = await req.json();

      if (action === 'send_message') {
        // Send message via NotificationAPI
        const notificationResponse = await fetch('https://api.notificationapi.com/v1/notification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notificationApiSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId: 'room_message',
            userId: roomId, // Use roomId as channel identifier
            payload: {
              message,
              userId,
              roomId,
              timestamp: new Date().toISOString(),
            },
            pushNotification: {
              title: 'New message',
              body: message,
            },
            inAppNotification: {
              title: 'New message',
              body: message,
            }
          }),
        });

        if (!notificationResponse.ok) {
          throw new Error('Failed to send notification');
        }

        // Store in Supabase
        const { data, error } = await supabase
          .from('room_messages')
          .insert({
            room_id: roomId,
            user_id: userId,
            message: message,
          })
          .select('*')
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, message: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'sync_users') {
        // Sync room members as NotificationAPI users
        const { data: members } = await supabase
          .from('room_members')
          .select(`
            user_id,
            profiles (
              full_name,
              email
            )
          `)
          .eq('room_id', roomId);

        // Register users with NotificationAPI if needed
        if (members) {
          for (const member of members) {
            await fetch('https://api.notificationapi.com/v1/user', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${notificationApiSecret}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: member.user_id,
                email: member.profiles?.email,
                name: member.profiles?.full_name,
              }),
            });
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in notificationapi-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});