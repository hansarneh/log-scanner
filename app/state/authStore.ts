import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

interface AuthState {
  user: UserProfile | null
  session: any | null
  isLoading: boolean
  isAuthenticated: boolean
  tempUserData: any | null
  
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
  tempUserData: null,

  initializeAuth: async () => {
    console.log('AuthStore: Starting auth initialization...')
    set({ isLoading: true })
    
    try {
      console.log('AuthStore: Checking Supabase availability...')
      // Check if Supabase is properly initialized
      if (!supabase || !supabase.auth) {
        console.warn('AuthStore: Supabase auth not available, skipping auth initialization')
        set({ isLoading: false, isAuthenticated: false })
        return
      }
      
      // Additional safety check for Supabase client
      if (typeof supabase.auth.getSession !== 'function') {
        console.warn('AuthStore: Supabase auth methods not available, using fallback')
        set({ isLoading: false, isAuthenticated: false })
        return
      }
      
      console.log('AuthStore: Getting initial session...')
      // Get initial session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('AuthStore: Error getting session:', sessionError)
        // Don't crash, continue without session
      }
      
      if (session) {
        console.log('AuthStore: Session found, setting authenticated state')
        set({ session, isAuthenticated: true })
        try {
          await get().loadUserProfile()
        } catch (profileError) {
          console.error('AuthStore: Error loading user profile:', profileError)
          // Don't crash, continue without profile
        }
      } else {
        console.log('AuthStore: No session found, user not authenticated')
      }
      
      console.log('AuthStore: Setting up auth state change listener...')
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('AuthStore: Auth state change:', event, !!session)
        if (event === 'SIGNED_IN' && session) {
          set({ session, isAuthenticated: true })
          
          // Check if we have temporary user data to create profile
          const { tempUserData } = get()
          if (tempUserData) {
            console.log('Creating user profile from temp data:', tempUserData)
            
            try {
              // Create the user profile now that user is authenticated
              const { error: profileError } = await supabase
                .from('user_profiles')
                .insert(tempUserData)
              
              if (profileError) {
                console.error('Error creating user profile:', profileError)
              } else {
                console.log('User profile created successfully')
                // Clear temp data
                set((state) => ({ ...state, tempUserData: null }))
              }
            } catch (profileError) {
              console.error('Error creating user profile:', profileError)
            }
          }
          
          try {
            await get().loadUserProfile()
          } catch (profileError) {
            console.error('AuthStore: Error loading user profile on sign in:', profileError)
          }
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, isAuthenticated: false, tempUserData: null })
        }
      })
      
      console.log('AuthStore: Auth initialization completed successfully')
    } catch (error) {
      console.error('AuthStore: Error initializing auth:', error)
      // Don't crash the app, just log the error and continue
      set({ isLoading: false, isAuthenticated: false })
    } finally {
      console.log('AuthStore: Setting loading to false')
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
    console.log('AuthStore: Starting signup for:', email, fullName)
    try {
      // Store the user data temporarily for profile creation after auth
      const tempUserData = { fullName, email }
      
      console.log('AuthStore: Calling Supabase auth.signUp...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })
      
      console.log('AuthStore: Supabase signup response:', { data: !!data, error: !!error, userId: data?.user?.id })
      
      if (error) {
        console.error('AuthStore: Supabase signup error:', error)
        throw error
      }
      
      // Store the user data in memory for later profile creation
      if (data.user) {
        console.log('AuthStore: User created, storing temp data...')
        // We'll create the profile after the user signs in
        // Store the data temporarily in the store
        set((state) => ({
          ...state,
          tempUserData: {
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName
          }
        }))
        console.log('AuthStore: Temp data stored successfully')
        
        // Note: User will need to confirm email before they can sign in
        console.log('AuthStore: User created successfully. Email confirmation required before signin.')
      }
      
      console.log('AuthStore: Signup completed successfully')
      return { success: true }
    } catch (error: any) {
      console.error('AuthStore: Signup failed:', error)
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
        .maybeSingle() // Use maybeSingle() instead of single() to handle no results gracefully
      
      if (error) {
        console.error('Error loading user profile:', error)
        return
      }
      
      if (data) {
        set({ user: data })
        console.log('User profile loaded successfully:', data.email)
      } else {
        // No profile found, create a basic one
        console.log('No user profile found, creating basic profile...')
        const basicProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || '',
          updated_at: new Date().toISOString()
        }
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(basicProfile)
        
        if (insertError) {
          console.error('Error creating user profile:', insertError)
          // Set basic profile anyway for app functionality
          set({ user: basicProfile })
        } else {
          console.log('User profile created successfully')
          set({ user: basicProfile })
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Don't crash, just log the error
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
