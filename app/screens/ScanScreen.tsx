import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOrderStore } from '../state/orderStore'
import { HiddenScannerInput } from '../components/HiddenScannerInput'
import { LineRow } from '../components/LineRow'
import { Totals } from '../components/Totals'
import { EmptyState } from '../components/EmptyState'
import { LocalProduct } from '../lib/db'

export default function ScanScreen() {
  const router = useRouter()
  const { 
    currentOrder, 
    orderItems, 
    addScannedItem, 
    addManualItem, 
    updateItemQty, 
    removeItem,
    isLoading,
    lastScannedEAN,
    lastScannedProduct
  } = useOrderStore()
  
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualEAN, setManualEAN] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualPrice, setManualPrice] = useState('')

  useEffect(() => {
    if (!currentOrder) {
      router.replace('/')
      return
    }
  }, [currentOrder, router])

  const handleScan = async (ean: string) => {
    await addScannedItem(ean)
  }

  const handleManualEntry = async () => {
    if (!manualEAN.trim() || !manualName.trim() || !manualPrice.trim()) {
      Alert.alert('Feil', 'Alle felter må fylles ut')
      return
    }

    const price = parseFloat(manualPrice)
    if (isNaN(price) || price <= 0) {
      Alert.alert('Feil', 'Ugyldig pris')
      return
    }

    try {
      await addManualItem(manualEAN.trim(), manualName.trim(), price)
      setShowManualEntry(false)
      setManualEAN('')
      setManualName('')
      setManualPrice('')
    } catch (error) {
      console.error('Error adding manual item:', error)
      Alert.alert('Feil', 'Kunne ikke legge til vare')
    }
  }

  const handleContinue = () => {
    if (orderItems.size === 0) {
      Alert.alert('Feil', 'Legg til minst én vare før du fortsetter')
      return
    }
    router.push('/review')
  }

  const renderItem = ({ item }: { item: any }) => (
    <LineRow
      item={item}
      onUpdateQty={updateItemQty}
      onRemove={removeItem}
    />
  )



  if (!currentOrder) {
    return null
  }

  return (
    <View style={styles.container}>
      <HiddenScannerInput onScan={handleScan} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Skann varer</Text>
        <Text style={styles.customerInfo}>
          {currentOrder.customer_name}
          {currentOrder.sales_rep && ` • ${currentOrder.sales_rep}`}
        </Text>
      </View>

      {/* Last scanned feedback */}
      {lastScannedEAN && (
        <View style={styles.lastScanChip}>
          <Text style={styles.lastScanLabel}>Siste skann:</Text>
          <Text style={styles.lastScanEAN}>{lastScannedEAN}</Text>
          {lastScannedProduct && (
            <Text style={styles.lastScanProduct}>{lastScannedProduct.name}</Text>
          )}
        </View>
      )}

      {/* Manual entry button */}
      <TouchableOpacity
        style={styles.manualEntryButton}
        onPress={() => setShowManualEntry(true)}
      >
        <Text style={styles.manualEntryButtonText}>Legg til manuelt</Text>
      </TouchableOpacity>

      {/* Order items */}
      {orderItems.size > 0 ? (
        <FlatList
          data={Array.from(orderItems.values())}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.itemsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="Ingen varer ennå"
          message="Skann en strekkode eller legg til manuelt for å komme i gang"
          icon="📦"
        />
      )}

      {/* Totals and continue button */}
      {orderItems.size > 0 && (
        <>
          <Totals items={Array.from(orderItems.values())} />
          
          <TouchableOpacity
            style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Laster...' : 'Fortsett til gjennomgang'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Manual entry modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Legg til manuelt</Text>
            <TouchableOpacity
              onPress={() => setShowManualEntry(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Lukk</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EAN *</Text>
              <TextInput
                style={styles.input}
                value={manualEAN}
                onChangeText={setManualEAN}
                placeholder="4007817327320"
                keyboardType="numeric"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Produktnavn *</Text>
              <TextInput
                style={styles.input}
                value={manualName}
                onChangeText={setManualName}
                placeholder="Produktnavn"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pris (kr) *</Text>
              <TextInput
                style={styles.input}
                value={manualPrice}
                onChangeText={setManualPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleManualEntry}
          >
            <Text style={styles.addButtonText}>Legg til</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  customerInfo: {
    fontSize: 16,
    color: '#666',
  },
  lastScanChip: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  lastScanLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lastScanEAN: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lastScanProduct: {
    fontSize: 14,
    color: '#666',
  },
  manualEntryButton: {
    backgroundColor: '#34C759',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualEntryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsList: {
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalForm: {
    padding: 20,
    flex: 1,
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
  addButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})
