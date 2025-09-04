import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Safe initialization with fallbacks
let supabaseUrl: string
let supabaseAnonKey: string

try {
  supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || 'https://eajuzgkhygkkzwkkrzef.supabase.co'
  supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhanV6Z2toeWdra3p3a2tyemVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTQ0MTEsImV4cCI6MjA3MjI5MDQxMX0.KIm0m0ngMloLF7fukHVkOJ_r-ZZYEwM7v1ijR0vwJ_g'
  
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key available:', !!supabaseAnonKey)
} catch (error) {
  console.warn('Failed to initialize Supabase config:', error)
  // Use fallback values
  supabaseUrl = 'https://eajuzgkhygkkzwkkrzef.supabase.co'
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhanV6Z2toeWdra3p3a2tyemVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTQ0MTEsImV4cCI6MjA3MjI5MDQxMX0.KIm0m0ngMloLF7fukHVkOJ_r-ZZYEwM7v1ijR0vwJ_g'
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

export const supabaseServiceRole = createClient(
  supabaseUrl, 
  Constants.expoConfig?.extra?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
