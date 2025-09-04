import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Safe initialization with fallbacks
let supabaseUrl: string
let supabaseAnonKey: string

try {
  // Get configuration from multiple sources
  const configExtra = Constants.expoConfig?.extra
  const envUrl = process.env.SUPABASE_URL
  const envKey = process.env.SUPABASE_ANON_KEY
  
  console.log('Supabase config sources:', {
    hasConfigExtra: !!configExtra,
    hasEnvUrl: !!envUrl,
    hasEnvKey: !!envKey
  })
  
  supabaseUrl = configExtra?.SUPABASE_URL || envUrl || 'https://eajuzgkhygkkzwkkrzef.supabase.co'
  supabaseAnonKey = configExtra?.SUPABASE_ANON_KEY || envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhanV6Z2toeWdra3p3a2tyemVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTQ0MTEsImV4cCI6MjA3MjI5MDQxMX0.KIm0m0ngMloLF7fukHVkOJ_r-ZZYEwM7v1ijR0vwJ_g'
  
  // Validate the key is not undefined or empty
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined' || supabaseAnonKey === 'null') {
    throw new Error('SUPABASE_ANON_KEY is invalid or missing')
  }
  
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key available:', !!supabaseAnonKey)
  console.log('Supabase Key length:', supabaseAnonKey.length)
} catch (error) {
  console.warn('Failed to initialize Supabase config:', error)
  // Use fallback values
  supabaseUrl = 'https://eajuzgkhygkkzwkkrzef.supabase.co'
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhanV6Z2toeWdra3p3a2tyemVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTQ0MTEsImV4cCI6MjA3MjI5MDQxMX0.KIm0m0ngMloLF7fukHVkOJ_r-ZZYEwM7v1ijR0vwJ_g'
}

// Create a safe Supabase client with error handling
let supabase: any = null
let supabaseServiceRole: any = null

try {
  // Double-check we have valid keys before creating clients
  if (supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'undefined' && supabaseAnonKey !== 'null') {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
    
    supabaseServiceRole = createClient(
      supabaseUrl, 
      Constants.expoConfig?.extra?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('Supabase clients created successfully')
  } else {
    throw new Error('Invalid Supabase configuration')
  }
} catch (error) {
  console.error('Error creating Supabase clients:', error)
  // Create fallback clients that won't crash
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: null } }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not available' } }),
      signUp: async () => ({ data: null, error: { message: 'Supabase not available' } }),
      signOut: async () => ({ error: null })
    }
  }
  
  supabaseServiceRole = {
    auth: {
      admin: {
        getUserById: async () => ({ data: null, error: { message: 'Supabase not available' } })
      }
    }
  }
  
  console.log('Using fallback Supabase clients')
}

export { supabase, supabaseServiceRole }
