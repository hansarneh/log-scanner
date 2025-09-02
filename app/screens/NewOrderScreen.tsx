import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOrderStore } from '../state/orderStore'
import Constants from 'expo-constants'

export default function NewOrderScreen() {
  const router = useRouter()
  const { startNewOrder } = useOrderStore()
  
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [salesRep, setSalesRep] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const fairName = Constants.expoConfig?.extra?.FAIR_NAME || 'Myplant 2025'

  const handleStartScanning = async () => {
    if (!customerName.trim()) {
      Alert.alert('Feil', 'Kundenavn er påkrevd')
      return
    }

    setIsLoading(true)
    
    try {
      await startNewOrder({
        fair_name: fairName,
        sales_rep: salesRep.trim() || undefined,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
      })
      
      router.push('/scan')
    } catch (error) {
      console.error('Error starting order:', error)
      Alert.alert('Feil', 'Kunne ikke opprette ordre')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Ny Ordre</Text>
          <Text style={styles.subtitle}>{fairName}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kundenavn *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Skriv inn kundenavn"
              autoFocus
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-post (valgfritt)</Text>
            <TextInput
              style={styles.input}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="kunde@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Selger (valgfritt)</Text>
            <TextInput
              style={styles.input}
              value={salesRep}
              onChangeText={setSalesRep}
              placeholder="Ditt navn"
              autoCapitalize="words"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (!customerName.trim() || isLoading) && styles.buttonDisabled]}
          onPress={handleStartScanning}
          disabled={!customerName.trim() || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Oppretter...' : 'Start skanning'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  form: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})
