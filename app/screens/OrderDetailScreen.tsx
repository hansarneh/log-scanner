import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { database, LocalOrder, LocalOrderItem } from '../lib/db'
import { useOrderStore } from '../state/orderStore'

export default function OrderDetailScreen() {
  const router = useRouter()
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const { loadDraftOrder, isLoading } = useOrderStore()
  
  const [order, setOrder] = useState<LocalOrder | null>(null)
  const [orderItems, setOrderItems] = useState<LocalOrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      const orderData = await database.getOrder(orderId!)
      const items = await database.getOrderItems(orderId!)
      
      setOrder(orderData)
      setOrderItems(items)
    } catch (error) {
      console.error('Error loading order details:', error)
      Alert.alert('Feil', 'Kunne ikke laste ordredetaljer')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#FF9500'
      case 'finalized':
        return '#34C759'
      case 'sync_error':
        return '#FF3B30'
      default:
        return '#666'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Utkast'
      case 'finalized':
        return 'Fullført'
      case 'sync_error':
        return 'Synkroniseringsfeil'
      default:
        return status
    }
  }

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      const itemTotal = item.qty * item.price_kr
      const discountAmount = itemTotal * (item.discount_percent / 100)
      return total + (itemTotal - discountAmount)
    }, 0)
  }

  const handleContinueDraft = async () => {
    if (!orderId) return
    
    try {
      const success = await loadDraftOrder(orderId)
      if (success) {
        router.push('/cart?scan=true')
      } else {
        Alert.alert('Feil', 'Kunne ikke laste utkast')
      }
    } catch (error) {
      console.error('Error continuing draft:', error)
      Alert.alert('Feil', 'Kunne ikke laste utkast')
    }
  }

  const renderOrderItem = ({ item }: { item: LocalOrderItem }) => (
    <View style={styles.orderItemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemEAN}>EAN: {item.ean}</Text>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemQty}>Antall: {item.qty}</Text>
        <Text style={styles.itemPrice}>Pris: {item.price_kr.toFixed(2)} kr</Text>
        {item.discount_percent > 0 && (
          <Text style={styles.itemDiscount}>
            Rabatt: {item.discount_percent}% {item.discount_reason && `(${item.discount_reason})`}
          </Text>
        )}
      </View>
      
      <View style={styles.itemTotal}>
        <Text style={styles.itemTotalText}>
          Total: {((item.qty * item.price_kr) * (1 - item.discount_percent / 100)).toFixed(2)} kr
        </Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Laster ordredetaljer...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ordre ikke funnet</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Tilbake</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.title}>Ordredetaljer</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.orderHeader}>
          <Text style={styles.customerName}>{order.customer_name}</Text>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(order.status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(order.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.orderDate}>
          Opprettet: {new Date(order.created_at).toLocaleDateString('nb-NO')}
        </Text>
        
        {order.fair_name && (
          <Text style={styles.fairName}>Messe: {order.fair_name}</Text>
        )}
        
        {order.sales_rep && (
          <Text style={styles.salesRep}>Selger: {order.sales_rep}</Text>
        )}
        
        {order.customer_email && (
          <Text style={styles.customerEmail}>E-post: {order.customer_email}</Text>
        )}
        
        {order.note && (
          <Text style={styles.note}>Notat: {order.note}</Text>
        )}
        
        <Text style={styles.orderId}>Ordre-ID: {order.id}</Text>
      </View>

      <View style={styles.itemsSection}>
        <Text style={styles.sectionTitle}>Ordrelinjer ({orderItems.length})</Text>
        
        {orderItems.length > 0 ? (
          <FlatList
            data={orderItems}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>Ingen varer i denne ordren</Text>
          </View>
        )}
      </View>

      {orderItems.length > 0 && (
        <View style={styles.totalSection}>
          <Text style={styles.totalText}>
            Totalt: {calculateTotal().toFixed(2)} kr
          </Text>
        </View>
      )}

      {/* Continue draft button for draft orders */}
      {order && order.status === 'draft' && (
        <View style={styles.continueDraftSection}>
          <TouchableOpacity
            style={[styles.continueDraftButton, isLoading && styles.continueDraftButtonDisabled]}
            onPress={handleContinueDraft}
            disabled={isLoading}
          >
            <Text style={styles.continueDraftButtonText}>
              {isLoading ? 'Laster...' : 'Fortsett utkast'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginBottom: 20,
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
  },
  placeholder: {
    width: 60, // Same width as back button for centering
  },
  orderInfo: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fairName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  salesRep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  note: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  orderId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  itemsSection: {
    flex: 1,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemsList: {
    flex: 1,
  },
  orderItemCard: {
    backgroundColor: 'white',
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemEAN: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemQty: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemDiscount: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
  },
  itemTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
  },
  itemTotalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  emptyItems: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyItemsText: {
    fontSize: 16,
    color: '#666',
  },
  totalSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065A4D',
  },
  continueDraftSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  continueDraftButton: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueDraftButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  continueDraftButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})

