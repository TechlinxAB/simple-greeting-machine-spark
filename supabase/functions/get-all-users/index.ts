
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

// Updated CORS headers to ensure they work with all requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  // Handle CORS preflight requests properly
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Log headers for debugging
    console.log("Request headers:", JSON.stringify(Object.fromEntries([...req.headers])));
    
    // Extract the JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRole,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user from the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorized access attempt:", userError?.message || "Auth session missing!");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return new Response(JSON.stringify({ error: 'Error fetching user profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (profile?.role !== 'admin') {
      console.error("Access denied: User is not an admin");
      return new Response(JSON.stringify({ error: 'Unauthorized. Only administrators can access this function' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Get all users and their profiles
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error("Error listing users:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get all profiles to merge with user data
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, avatar_url');

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Map profiles to a dictionary for easy lookup
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // Combine user data with profile data
    const combinedData = users.users.map(user => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        profile_name: profile?.name || null,
        profile_role: profile?.role || 'user',
        profile_avatar_url: profile?.avatar_url || null
      };
    });

    console.log("Successfully retrieved users:", combinedData.length);
    
    return new Response(JSON.stringify(combinedData), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error in function:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
