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
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOrderStore } from '../state/orderStore'
import { LineRow } from '../components/LineRow'
import { Totals } from '../components/Totals'
import { LocalOrderItem } from '../lib/db'

export default function ReviewScreen() {
  const router = useRouter()
  const { 
    currentOrder, 
    orderItems, 
    updateItemQty, 
    removeItem,
    finalizeOrder,
    isLoading
  } = useOrderStore()
  
  const [note, setNote] = useState(currentOrder?.note || '')

  useEffect(() => {
    if (!currentOrder) {
      router.replace('/')
      return
    }
  }, [currentOrder, router])

  const handleFinalizeOrder = async () => {
    if (orderItems.size === 0) {
      Alert.alert('Feil', 'Ingen varer å sende')
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
              const success = await finalizeOrder(note.trim() || undefined)
              if (success) {
                Alert.alert(
                  'Suksess!',
                  'Ordren er sendt og e-post er sendt til kunden.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.replace('/orders')
                    }
                  ]
                )
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

  const renderItem = ({ item }: { item: LocalOrderItem }) => (
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Gjennomgang</Text>
          <Text style={styles.customerInfo}>
            {currentOrder.customer_name}
            {currentOrder.sales_rep && ` • ${currentOrder.sales_rep}`}
          </Text>
        </View>

        {/* Order summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ordresammendrag</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ordre-ID:</Text>
            <Text style={styles.summaryValue}>{currentOrder.id}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dato:</Text>
            <Text style={styles.summaryValue}>
              {new Date(currentOrder.created_at).toLocaleDateString('nb-NO')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Messe:</Text>
            <Text style={styles.summaryValue}>{currentOrder.fair_name}</Text>
          </View>
        </View>

        {/* Note field */}
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Notat (valgfritt)</Text>
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

      {/* Finalize button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finalizeButton, isLoading && styles.finalizeButtonDisabled]}
          onPress={handleFinalizeOrder}
          disabled={isLoading || orderItems.size === 0}
        >
          <Text style={styles.finalizeButtonText}>
            {isLoading ? 'Sender...' : 'Fullfør og send'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noteSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
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
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  finalizeButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  finalizeButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  finalizeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})
