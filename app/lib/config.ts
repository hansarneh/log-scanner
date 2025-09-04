import Constants from 'expo-constants'

// Supabase Configuration
export const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || process.env.SUPABASE_URL || 'https://eajuzgkhygkkzwkkrzef.supabase.co'
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// App Configuration
export const APP_CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  EDGE_FUNCTION_URL: `${SUPABASE_URL}/functions/v1`
}

// Validate configuration
if (!SUPABASE_ANON_KEY) {
  console.warn('SUPABASE_ANON_KEY not found in environment variables')
}
