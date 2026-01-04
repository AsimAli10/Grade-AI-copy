// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Supabase URL or service key missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create a Supabase client with the service role key
    const serviceRoleSupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await serviceRoleSupabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token', details: userError?.message }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get subscription from platform_subscriptions
    const { data: subscription, error: subError } = await serviceRoleSupabaseClient
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      return new Response(
        JSON.stringify({ error: 'Error fetching subscription', details: subError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!subscription) {
      // No subscription found, set profile to free
      const { error: profileError } = await serviceRoleSupabaseClient
        .from('profiles')
        .update({
          platform_subscription_id: null,
          platform_subscription_type: 'free',
          platform_subscription_plan_id: null,
        })
        .eq('id', user.id);

      if (profileError) {
        return new Response(
          JSON.stringify({ error: 'Error updating profile', details: profileError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Profile set to free (no active subscription found)' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Update profile with subscription data
    const { error: profileError } = await serviceRoleSupabaseClient
      .from('profiles')
      .update({
        platform_subscription_id: subscription.id,
        platform_subscription_type: subscription.subscription_type,
        platform_subscription_plan_id: subscription.platform_plan_id,
      })
      .eq('id', user.id);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Error updating profile', details: profileError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Profile synced successfully',
        subscription: {
          id: subscription.id,
          type: subscription.subscription_type,
          plan_id: subscription.platform_plan_id,
          is_active: subscription.is_active,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error syncing subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unable to sync subscription' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

