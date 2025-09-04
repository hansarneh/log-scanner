import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  fair_name?: string
  sales_rep_name?: string
  created_at: string
  updated_at: string
}

interface AuthState {
  user: UserProfile | null
  session: any | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>
  loadUserProfile: () => Promise<void>
  initializeAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  initializeAuth: async () => {
    set({ isLoading: true })
    
    try {
      // Check if Supabase is properly initialized
      if (!supabase.auth) {
        console.warn('Supabase auth not available, skipping auth initialization')
        set({ isLoading: false })
        return
      }
      
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        set({ session, isAuthenticated: true })
        await get().loadUserProfile()
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          set({ session, isAuthenticated: true })
          await get().loadUserProfile()
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, isAuthenticated: false })
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      // Don't crash the app, just set loading to false
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })
      
      if (error) throw error
      
      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            fair_name: 'Myplant 2025', // Default fair name
            sales_rep_name: fullName
          })
        
        if (profileError) throw profileError
      }
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
      set({ user: null, session: null, isAuthenticated: false })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  },

  loadUserProfile: async () => {
    const { session } = get()
    if (!session?.user) return
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (error) throw error
      
      set({ user: data })
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user } = get()
    if (!user) return { success: false, error: 'No user logged in' }
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Reload profile
      await get().loadUserProfile()
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}))
