import { createClient } from '@supabase/supabase-js'

// Hardcoded credentials from app.json
const SUPABASE_URL = 'https://eajuzgkhygkkzwkkrzef.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhanV6Z2toeWdra3p3a2tyemVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTQ0MTEsImV4cCI6MjA3MjI5MDQxMX0.KIm0m0ngMloLF7fukHVkOJ_r-ZZYEwM7v1ijR0vwJ_g'

console.log('Creating Supabase client with:', { SUPABASE_URL, hasKey: !!SUPABASE_ANON_KEY })

// Create the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Create a service role client (empty for now)
const supabaseServiceRole = {
  auth: {
    admin: {
      getUserById: async () => ({ data: null, error: { message: 'Service role not configured' } })
    }
  }
}

export { supabase, supabaseServiceRole }
