import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useOrderStore } from './state/orderStore'
import { LineRow } from './components/LineRow'
import { Totals } from './components/Totals'
import { EmptyState } from './components/EmptyState'
import { CameraScanner } from './components/CameraScanner'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from './lib/design'

export default function CartScreen() {
  const router = useRouter()
  const { scan } = useLocalSearchParams()
  const { 
    currentOrder, 
    orderItems, 
    updateItemQty, 
    updateItemDiscount,
    removeItem,
    addScannedItem,
    isLoading
  } = useOrderStore()

  const [isScanning, setIsScanning] = useState(false)

  // Auto-open scanner if scan parameter is present
  useEffect(() => {
    if (scan === 'true') {
      setIsScanning(true)
      // Remove the scan parameter from URL
      router.replace('/cart')
    }
  }, [scan, router])

  const handleContinue = () => {
    if (orderItems.size === 0) {
      return
    }
    router.push('/review')
  }

  const handleScan = async (ean: string) => {
    try {
      await addScannedItem(ean)
      setIsScanning(false)
      // Stay on cart page to show the added item
    } catch (error) {
      console.error('Error scanning item:', error)
      setIsScanning(false)
    }
  }

  const handleStartScanning = () => {
    setIsScanning(true)
  }

  const renderItem = ({ item }: { item: any }) => (
    <LineRow
      item={item}
      onUpdateQty={updateItemQty}
      onRemove={removeItem}
      onUpdateDiscount={updateItemDiscount}
    />
  )

  if (!currentOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Tilbake</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Handlekurv</Text>
        </View>
        <EmptyState
          title="Handlekurven er tom"
          message="Legg til produkter via søk eller skanning for å komme i gang"
          icon="🛒"
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Handlekurv</Text>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleStartScanning}
        >
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      {orderItems.size > 0 ? (
        <>
          <FlatList
            data={Array.from(orderItems.values())}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.footer}>
            <Totals items={Array.from(orderItems.values())} />
            
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                Fortsett til gjennomgang
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <EmptyState
          title="Handlekurven er tom"
          message="Legg til produkter via søk eller skanning for å komme i gang"
          icon="🛒"
        />
      )}

      {/* Camera Scanner */}
      {isScanning && (
        <CameraScanner
          onScan={handleScan}
          onClose={() => setIsScanning(false)}
          visible={isScanning}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.small,
  },
  backButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    fontSize: 20,
  },
  itemsList: {
    flex: 1,
  },
  footer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.small,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
})
