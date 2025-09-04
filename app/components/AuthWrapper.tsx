import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { useAuthStore } from '../state/authStore'
import LoginScreen from '../screens/LoginScreen'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore()

  useEffect(() => {
    console.log('AuthWrapper: Starting initialization...')
    
    const initAuth = async () => {
      try {
        console.log('AuthWrapper: Calling initializeAuth...')
        await initializeAuth()
        console.log('AuthWrapper: initializeAuth completed successfully')
      } catch (error) {
        console.error('AuthWrapper: Error during initialization:', error)
        // Don't crash the app, just log the error
      }
    }
    
    initAuth()
  }, [initializeAuth])

  console.log('AuthWrapper: Render state - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated)

  if (isLoading) {
    console.log('AuthWrapper: Showing loading state')
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    )
  }

  if (!isAuthenticated) {
    console.log('AuthWrapper: Showing login screen')
    return <LoginScreen />
  }

  console.log('AuthWrapper: Showing main app')
  return <>{children}</>
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
})
