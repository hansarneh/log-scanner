import React from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AuthWrapper from './components/AuthWrapper'
import { View, Text, StyleSheet, Alert } from 'react-native'

// Global error handler
if (__DEV__) {
  const originalConsoleError = console.error
  console.error = (...args) => {
    originalConsoleError(...args)
    // In development, show error alerts
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Error')) {
      Alert.alert('Console Error', args[0])
    }
  }
}

// Global unhandled promise rejection handler - removed for React Native compatibility

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed with error:', error)
    console.error('Error info:', errorInfo)
    Alert.alert('App Crashed', 'Error: ' + (error?.message || 'Unknown error'))
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>The app has crashed. Please restart.</Text>
          {this.state.error && (
            <Text style={styles.errorDetails}>{this.state.error.message}</Text>
          )}
        </View>
      )
    }

    return this.props.children
  }
}

export default function RootLayout() {
  console.log('RootLayout: Rendering...')
  
  return (
    <ErrorBoundary>
      <AuthWrapper>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="review" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="add-product" />
        </Stack>
      </AuthWrapper>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
})
