// @ts-nocheck - Supabase Edge Functions (Deno)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    // @ts-ignore
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRole) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const body = await req.json();
    const { userId, email, full_name, role } = body || {};
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing userId or email' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Validate role
    const validRoles = ['admin', 'teacher', 'student'];
    const userRole = role && validRoles.includes(role) ? role : 'teacher';

    // Validate JWT belongs to this user
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Upsert via service role (bypass RLS)
    const admin = createClient(supabaseUrl, serviceRole);
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({ 
        id: userId, 
        email, 
        full_name: full_name || null, 
        role: userRole 
      }, { onConflict: 'id' });

    if (upsertError) {
      return new Response(JSON.stringify({ error: 'Failed to save profile', details: upsertError.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e?.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});


