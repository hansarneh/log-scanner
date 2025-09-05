import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { productsCache } from '../lib/productsCache'

export default function AddProductScreen() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [ean, setEan] = useState('')
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')

  const handleAddProduct = async () => {
    // Validation
    if (!ean.trim()) {
      Alert.alert('Feil', 'EAN er påkrevd')
      return
    }
    
    if (!name.trim()) {
      Alert.alert('Feil', 'Produktnavn er påkrevd')
      return
    }
    
    if (!price.trim()) {
      Alert.alert('Feil', 'Pris er påkrevd')
      return
    }

    const priceValue = parseFloat(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Feil', 'Ugyldig pris')
      return
    }

    // Check if EAN already exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('ean', ean.trim())
      .single()

    if (existingProduct) {
      Alert.alert('Feil', 'En produkt med denne EAN eksisterer allerede')
      return
    }

    setIsLoading(true)

    try {
      // Add product to Supabase
      const { data, error } = await supabase
        .from('products')
        .insert({
          ean: ean.trim(),
          sku: sku.trim() || null,
          name: name.trim(),
          price_kr: priceValue,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Force sync to update local cache
      await productsCache.forceSync()

      Alert.alert(
        'Suksess', 
        'Produkt lagt til!',
        [
          {
            text: 'Legg til flere',
            onPress: () => {
              // Reset form
              setEan('')
              setSku('')
              setName('')
              setPrice('')
              setDescription('')
            }
          },
          {
            text: 'Gå tilbake',
            onPress: () => router.back()
          }
        ]
      )

    } catch (error: any) {
      console.error('Error adding product:', error)
      Alert.alert('Feil', error.message || 'Kunne ikke legge til produkt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanEAN = () => {
    // This could be enhanced with actual barcode scanning
    Alert.alert('Info', 'EAN skanning kommer snart!')
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Tilbake</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Legg til produkt</Text>
            <Text style={styles.subtitle}>Opprett nytt produkt i databasen</Text>
          </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EAN *</Text>
            <View style={styles.eanContainer}>
              <TextInput
                style={[styles.input, styles.eanInput]}
                value={ean}
                onChangeText={setEan}
                placeholder="4007817327320"
                keyboardType="numeric"
                autoCapitalize="none"
                maxLength={13}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScanEAN}
              >
                <Text style={styles.scanButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SKU (valgfritt)</Text>
            <TextInput
              style={styles.input}
              value={sku}
              onChangeText={setSku}
              placeholder="SKU001"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Produktnavn *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Produktnavn"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pris (kr) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Beskrivelse (valgfritt)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Produktbeskrivelse..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleAddProduct}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Legg til produkt</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Avbryt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#065A4D',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  eanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eanInput: {
    flex: 1,
    marginRight: 12,
  },
  scanButton: {
    backgroundColor: '#065A4D',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#34C759',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#065A4D',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#065A4D',
    fontSize: 16,
    fontWeight: '600',
  },
})
