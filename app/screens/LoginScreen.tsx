import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native'
import { useAuthStore } from '../state/authStore'
import Constants from 'expo-constants'
import { Colors, Typography, Spacing, BorderRadius, Shadows, Images, ButtonStyles } from '../lib/design'
// import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { signIn, signUp } = useAuthStore()

  const fairName = (() => {
    try {
      return Constants.expoConfig?.extra?.FAIR_NAME || 'LOG MESSE'
    } catch (error) {
      console.warn('Failed to get fair name from constants:', error)
      return 'LOG MESSE'
    }
  })()

  const handleAuth = async () => {
    console.log('LoginScreen: handleAuth called, isSignUp:', isSignUp)
    console.log('LoginScreen: Form data:', { email, password, fullName })
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (isSignUp && !fullName) {
      Alert.alert('Error', 'Please enter your full name')
      return
    }

    console.log('LoginScreen: Starting authentication...')
    setIsLoading(true)

    try {
      let result
      if (isSignUp) {
        console.log('LoginScreen: Calling signUp...')
        result = await signUp(email, password, fullName)
        console.log('LoginScreen: signUp result:', result)
      } else {
        console.log('LoginScreen: Calling signIn...')
        result = await signIn(email, password)
        console.log('LoginScreen: signIn result:', result)
      }

      if (!result.success) {
        console.log('LoginScreen: Authentication failed:', result.error)
        Alert.alert('Error', result.error || 'Authentication failed')
      } else {
        console.log('LoginScreen: Authentication successful!')
        if (isSignUp) {
          Alert.alert(
            'Account Created!', 
            'Please check your email and click the confirmation link before signing in.',
            [{ text: 'OK', onPress: () => setIsSignUp(false) }]
          )
        }
      }
    } catch (error) {
      console.error('LoginScreen: Unexpected error:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with Logo Only */}
        <View style={styles.header}>
          <Image 
            source={{ uri: Images.logo }} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.secondaryButtonText}>
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: Spacing.lg,
    alignSelf: 'center',
  },
  formContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  formTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  formSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: width * 0.8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.bodySmall,
    color: Colors.text,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text,
    ...Shadows.small,
  },
  primaryButton: {
    ...ButtonStyles.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '600',
  },
  secondaryButton: {
    ...ButtonStyles.text,
  },
  secondaryButtonText: {
    ...Typography.body,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
})
