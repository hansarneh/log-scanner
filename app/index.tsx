import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { productsCache } from './lib/productsCache'
import Constants from 'expo-constants'

export default function IndexScreen() {
  const router = useRouter()
  const fairName = Constants.expoConfig?.extra?.FAIR_NAME || 'Myplant 2025'

  useEffect(() => {
    // Preload products on app start
    productsCache.syncProducts()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Fair Scanner</Text>
          <Text style={styles.subtitle}>{fairName}</Text>
        </View>

        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            Skann strekkoder og opprett ordrer på messen
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/new-order')}
          >
            <Text style={styles.primaryButtonText}>Ny ordre</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/orders')}
          >
            <Text style={styles.secondaryButtonText}>Se ordrer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            Hold appen oppdatert for beste ytelse
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
  },
  description: {
    alignItems: 'center',
    marginBottom: 60,
  },
  descriptionText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },
  buttonContainer: {
    marginBottom: 60,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: '600',
  },
  info: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
})
