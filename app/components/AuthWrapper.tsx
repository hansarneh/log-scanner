import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Text, Alert } from 'react-native'
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
        Alert.alert('Error', 'Failed to initialize auth: ' + error.message)
      }
    }
    
    initAuth()
  }, [initializeAuth])

  // Add error boundary for render errors
  try {
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
  } catch (error) {
    console.error('AuthWrapper: Render error:', error)
    Alert.alert('Render Error', 'Failed to render: ' + error.message)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Render Error</Text>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    )
  }
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
})
