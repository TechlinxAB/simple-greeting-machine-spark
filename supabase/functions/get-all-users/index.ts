
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xojrleypudfrbmvejpow.supabase.co'
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  // Create a Supabase client with the Auth context of the logged in user
  const supabaseClient = createClient(
    supabaseUrl,
    supabaseServiceRole,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  )

  // Get the user that called the function
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  // Check if the user is an admin
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized. Only administrators can access this function' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 403,
    })
  }

  // Get all users and their profiles
  const { data: users, error } = await supabaseClient.auth.admin.listUsers()
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // Get all profiles to merge with user data
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('id, name, role, avatar_url')

  // Map profiles to a dictionary for easy lookup
  const profileMap = new Map()
  if (profiles) {
    profiles.forEach(profile => {
      profileMap.set(profile.id, profile)
    })
  }

  // Combine user data with profile data
  const combinedData = users.users.map(user => {
    const profile = profileMap.get(user.id)
    return {
      id: user.id,
      email: user.email,
      profile_name: profile?.name || null,
      profile_role: profile?.role || 'user',
      profile_avatar_url: profile?.avatar_url || null
    }
  })

  return new Response(JSON.stringify(combinedData), { 
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
