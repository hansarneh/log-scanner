import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOrderStore } from '../state/orderStore'
import { LineRow } from '../components/LineRow'
import { Totals } from '../components/Totals'
import { CustomDialog } from '../components/CustomDialog'
import { LocalOrderItem } from '../lib/db'

export default function ReviewScreen() {
  const router = useRouter()
  const { 
    currentOrder, 
    orderItems, 
    updateItemQty, 
    updateItemDiscount,
    removeItem,
    updateOrderDetails,
    finalizeOrder,
    isLoading
  } = useOrderStore()
  
  const [customerName, setCustomerName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null)
  const [note, setNote] = useState(currentOrder?.note || '')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  useEffect(() => {
    if (!currentOrder) {
      router.replace('/')
      return
    }
  }, [currentOrder, router])

  const showDatePickerAlert = () => {
    const today = new Date()
    const options = []
    
    // Generer de neste 30 dagene
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toLocaleDateString('nb-NO')
      options.push(dateStr)
    }
    
    Alert.alert(
      'Velg leveringsdato',
      'Velg ønsket leveringsdato:',
      [
        ...options.map((dateStr, index) => ({
          text: dateStr,
          onPress: () => {
            const selectedDate = new Date(today)
            selectedDate.setDate(today.getDate() + index)
            setDeliveryDate(selectedDate)
          }
        })),
        { text: 'Avbryt', style: 'cancel' }
      ]
    )
  }

  const handleFinalizeOrder = async () => {
    if (orderItems.size === 0) {
      Alert.alert('Feil', 'Ingen varer å sende')
      return
    }

    if (!customerName.trim()) {
      Alert.alert('Feil', 'Kundenavn er påkrevd')
      return
    }

    Alert.alert(
      'Bekreft ordre',
      'Er du sikker på at du vil fullføre og sende denne ordren?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            try {
              // First save order details
              await updateOrderDetails(
                customerName.trim(),
                deliveryDate ? deliveryDate.toISOString() : undefined
              )
              
              // Then finalize the order
              const success = await finalizeOrder(note.trim() || undefined)
              if (success) {
                setShowSuccessDialog(true)
              } else {
                Alert.alert('Feil', 'Kunne ikke sende ordren. Prøv igjen senere.')
              }
            } catch (error) {
              console.error('Error finalizing order:', error)
              Alert.alert('Feil', 'En uventet feil oppstod')
            }
          }
        }
      ]
    )
  }

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false)
    router.replace('/')
  }

  const renderItem = ({ item }: { item: LocalOrderItem }) => (
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Tilbake</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Gjennomgang</Text>
          <TouchableOpacity
            style={[styles.finalizeButton, isLoading && styles.finalizeButtonDisabled]}
            onPress={handleFinalizeOrder}
            disabled={isLoading || orderItems.size === 0}
          >
            <Text style={styles.finalizeButtonIcon}>✓</Text>
          </TouchableOpacity>
        </View>

        {/* Customer details */}
        <View style={styles.customerCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kundenavn *</Text>
            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Skriv inn kundenavn"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ønsket leveringsdato (valgfritt)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={showDatePickerAlert}
            >
              <Text style={styles.dateButtonText}>
                {deliveryDate 
                  ? deliveryDate.toLocaleDateString('nb-NO')
                  : 'Velg leveringsdato'
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notat (valgfritt)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Legg til notat til ordren..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>


        {/* Order items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Varer ({orderItems.size})</Text>
          <FlatList
            data={Array.from(orderItems.values())}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Totals */}
        <Totals items={Array.from(orderItems.values())} />
      </ScrollView>

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title="Ordre fullført!"
        message="Ordren er sendt og e-post er sendt til kunden."
        onClose={handleSuccessDialogClose}
        buttonText="OK"
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
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
    flex: 1,
    textAlign: 'center',
  },
  customerCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'white',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemsSection: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  finalizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#065A4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalizeButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  finalizeButtonIcon: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
})
