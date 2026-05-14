import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('Error: Missing Authorization header')
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Verify caller identity using their JWT
    console.log('Verifying caller JWT...')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    console.log(`Caller identified: ${user.id}`)

    // 2. Check admin permission
    console.log('Checking admin permission...')
    let profileData = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      
    if (!profileData.data) {
      profileData = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
    }

    if (profileData.error || !profileData.data || profileData.data.role !== 'admin') {
      console.error(`Not authorized error. Role found: ${profileData.data?.role}`)
      return new Response(JSON.stringify({ error: 'Not authorized. Admin access required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }
    console.log(`Admin permission verified.`)

    // 3. Get target user ID from request body
    const body = await req.json()
    const { authUserId } = body
    console.log(`Target requested authUserId: ${authUserId}`)
    
    if (!authUserId) {
      return new Response(JSON.stringify({ error: 'authUserId is required in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 4. Create service role client to bypass RLS and access admin methods
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Delete user from Supabase Auth explicitly using authUserId
    console.log(`Deleting auth user: ${authUserId}`)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
    if (deleteAuthError) {
      if (deleteAuthError.message && deleteAuthError.message.includes('User not found')) {
        console.warn(`Auth User not found. Proceeding to clean up orphaned profile.`)
      } else {
        console.error(`Failed to delete Auth User: ${deleteAuthError.message}`)
        return new Response(JSON.stringify({ error: `Failed to delete Auth User: ${deleteAuthError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
    } else {
      console.log(`Auth user deleted successfully.`)
    }

    // 6. Delete from profiles using auth_user_id
    console.log(`Deleting profile for auth_user_id: ${authUserId}`)
    const { data: deletedProfiles, error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('auth_user_id', authUserId)
      .select('id, auth_user_id, email')

    if (deleteProfileError) {
      console.error('Failed to delete profile:', deleteProfileError)
      return new Response(JSON.stringify({ error: `Failed to delete profile: ${deleteProfileError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!deletedProfiles || deletedProfiles.length === 0) {
      console.error('Auth deleted but matching profile row was not found or not deleted.')
      return new Response(JSON.stringify({ error: 'Auth deleted but matching profile row was not found or not deleted.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    console.log(`Profile deleted successfully:`, deletedProfiles)

    // Final Success Response
    return new Response(JSON.stringify({ success: true, message: 'User and profile deleted successfully', deletedAuthUserId: authUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Delete user edge function unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
