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
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOrderStore } from '../state/orderStore'
import { CameraScanner } from '../components/CameraScanner'
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
    updateItemDiscount,
    removeItem,
    saveDraftOrder,
    isLoading,
    lastScannedEAN,
    lastScannedProduct
  } = useOrderStore()
  
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualEAN, setManualEAN] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [draftCustomerName, setDraftCustomerName] = useState('')
  const [showCameraScanner, setShowCameraScanner] = useState(false)

  useEffect(() => {
    if (!currentOrder) {
      // Create a new order if none exists
      const createOrder = async () => {
        try {
          const { startNewOrder } = useOrderStore.getState()
          await startNewOrder({
            fair_name: 'Fair Scanner',
            sales_rep: 'User',
            customer_name: 'Walk-in Customer',
            customer_email: '',
            note: ''
          })
        } catch (error) {
          console.error('Error creating order:', error)
          router.replace('/')
        }
      }
      createOrder()
    }
  }, [currentOrder, router])

  const handleScan = async (ean: string) => {
    try {
      await addScannedItem(ean)
      // Note: Keep camera open to show feedback and allow continuous scanning
    } catch (error) {
      console.error('Error handling scan:', error)
    }
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
      await addManualItem(manualEAN.trim(), manualName.trim(), price, 0, undefined, undefined)
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

  const handleSaveDraft = () => {
    if (orderItems.size === 0) {
      Alert.alert('Feil', 'Legg til minst én vare før du lagrer utkast')
      return
    }
    setShowDraftModal(true)
  }

  const handleConfirmSaveDraft = async () => {
    if (!draftCustomerName.trim()) {
      Alert.alert('Feil', 'Kundenavn er påkrevd')
      return
    }

    try {
      const success = await saveDraftOrder(draftCustomerName.trim())
      if (success) {
        Alert.alert('Suksess', 'Utkast lagret!', [
          {
            text: 'OK',
            onPress: () => {
              setShowDraftModal(false)
              setDraftCustomerName('')
              router.push('/orders')
            }
          }
        ])
      } else {
        Alert.alert('Feil', 'Kunne ikke lagre utkast')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      Alert.alert('Feil', 'Kunne ikke lagre utkast')
    }
  }

  const renderItem = ({ item }: { item: any }) => (
    <LineRow
      item={item}
      onUpdateQty={updateItemQty}
      onRemove={removeItem}
      onUpdateDiscount={(itemId, discount_percent, discount_reason) => {
        updateItemDiscount(itemId, discount_percent, discount_reason)
      }}
    />
  )



  if (!currentOrder) {
    return null
  }

  // Create feedback object for camera scanner
  const scanFeedback = lastScannedEAN ? {
    ean: lastScannedEAN,
    productName: lastScannedProduct?.name,
    price: lastScannedProduct?.price_kr,
    found: !!lastScannedProduct
  } : undefined

  return (
    <SafeAreaView style={styles.container}>
      {showCameraScanner && (
        <CameraScanner 
          onScan={handleScan}
          onClose={() => setShowCameraScanner(false)}
          visible={showCameraScanner}
          lastScanFeedback={scanFeedback}
        />
      )}
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Tilbake</Text>
        </TouchableOpacity>
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

      {/* Scanner and manual entry buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.scannerButton}
          onPress={() => setShowCameraScanner(true)}
        >
          <Text style={styles.scannerButtonText}>📷 Skann strekkode</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.manualEntryButton}
          onPress={() => setShowManualEntry(true)}
        >
          <Text style={styles.manualEntryButtonText}>✏️ Legg til manuelt</Text>
        </TouchableOpacity>
      </View>

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

      {/* Totals and buttons */}
      {orderItems.size > 0 && (
        <>
          <Totals items={Array.from(orderItems.values())} />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveDraftButton, isLoading && styles.saveDraftButtonDisabled]}
              onPress={handleSaveDraft}
              disabled={isLoading}
            >
              <Text style={styles.saveDraftButtonText}>
                {isLoading ? 'Laster...' : 'Lagre utkast'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? 'Laster...' : 'Fortsett til gjennomgang'}
              </Text>
            </TouchableOpacity>
          </View>
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

      {/* Draft modal */}
      <Modal
        visible={showDraftModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDraftModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Lagre utkast</Text>
            <Text style={styles.modalSubtitle}>
              Fyll ut kundenavn for å lagre dette utkastet
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kundenavn *</Text>
              <TextInput
                style={styles.input}
                value={draftCustomerName}
                onChangeText={setDraftCustomerName}
                placeholder="Skriv inn kundenavn"
                autoCapitalize="words"
                autoFocus={true}
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDraftModal(false)
                  setDraftCustomerName('')
                }}
              >
                <Text style={styles.cancelButtonText}>Avbryt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleConfirmSaveDraft}
              >
                <Text style={styles.saveButtonText}>Lagre utkast</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#065A4D',
    fontWeight: '600',
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
  buttonRow: {
    flexDirection: 'row',
    margin: 20,
    gap: 12,
  },
  scannerButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scannerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryButton: {
    flex: 1,
    backgroundColor: '#34C759',
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
    backgroundColor: '#065A4D',
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
    color: '#065A4D',
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
    backgroundColor: '#065A4D',
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
  buttonContainer: {
    flexDirection: 'row',
    margin: 20,
    gap: 12,
  },
  saveDraftButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveDraftButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveDraftButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
