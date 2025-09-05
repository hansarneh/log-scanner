import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOrderStore } from '../state/orderStore'
import { database, LocalOrder } from '../lib/db'
import { productsCache } from '../lib/productsCache'

export default function OrdersScreen() {
  const router = useRouter()
  const { syncDraftOrders, isLoading } = useOrderStore()
  
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<LocalOrder[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'draft' | 'finalized'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [orderTotals, setOrderTotals] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    loadOrders()
    // Initial products sync
    productsCache.syncProducts()
    // Initial order sync from Supabase
    syncDraftOrders().catch(error => {
      console.error('Error syncing orders on load:', error)
    })
  }, [])

  useEffect(() => {
    applyFilter()
  }, [orders, filter, searchQuery])

  const loadOrders = async () => {
    try {
      const allOrders = await database.getAllOrders()
      setOrders(allOrders)
      
      // Load totals for all orders
      const totals = new Map<string, number>()
      for (const order of allOrders) {
        try {
          const total = await database.getOrderTotal(order.id)
          totals.set(order.id, total)
        } catch (error) {
          console.error(`Error loading total for order ${order.id}:`, error)
          totals.set(order.id, 0)
        }
      }
      setOrderTotals(totals)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const applyFilter = () => {
    let filtered = orders
    
    // Apply status filter
    if (filter === 'draft') {
      filtered = orders.filter(order => order.status === 'draft')
    } else if (filter === 'finalized') {
      filtered = orders.filter(order => order.status === 'finalized')
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(order => 
        order.customer_name.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        (order.order_number && order.order_number.toString().includes(query))
      )
    }
    
    setFilteredOrders(filtered)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await syncDraftOrders()
      await loadOrders()
      await productsCache.forceSync()
    } catch (error) {
      console.error('Error refreshing orders:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleSyncOrders = async () => {
    Alert.alert(
      'Synkroniser ordrer',
      'Vil du synkronisere alle utkast-ordrer?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Synkroniser',
          onPress: async () => {
            try {
              await syncDraftOrders()
              await loadOrders() // Refresh the list
              Alert.alert('Suksess', 'Ordrene er synkronisert')
            } catch (error) {
              console.error('Error syncing orders:', error)
              Alert.alert('Feil', 'Kunne ikke synkronisere ordrer')
            }
          }
        }
      ]
    )
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

  const handleOrderPress = (orderId: string) => {
    router.push(`/order-detail?orderId=${orderId}`)
  }

  const renderOrder = ({ item }: { item: LocalOrder }) => {
    const total = orderTotals.get(item.id) || 0
    const orderNumber = item.order_number || 'N/A'
    const deliveryDate = item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('nb-NO') : 'Ikke satt'
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => handleOrderPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderContent}>
          <View style={styles.orderInfo}>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <View style={styles.orderDetails}>
              <Text style={styles.orderNumber}>#{orderNumber}</Text>
              <Text style={styles.deliveryDate}>Levering: {deliveryDate}</Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>{total.toFixed(0)} kr</Text>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.title}>Ordre</Text>
        <TouchableOpacity
          style={[styles.syncButton, isLoading && styles.syncButtonDisabled]}
          onPress={handleSyncOrders}
          disabled={isLoading}
        >
          <Text style={styles.syncButtonText}>
            {isLoading ? 'Synkroniserer...' : 'Synkroniser'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Søk etter kunde, ordrenummer eller ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            Alle ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'draft' && styles.filterButtonActive]}
          onPress={() => setFilter('draft')}
        >
          <Text style={[styles.filterButtonText, filter === 'draft' && styles.filterButtonTextActive]}>
            Utkast ({orders.filter(o => o.status === 'draft').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'finalized' && styles.filterButtonActive]}
          onPress={() => setFilter('finalized')}
        >
          <Text style={[styles.filterButtonText, filter === 'finalized' && styles.filterButtonTextActive]}>
            Fullført ({orders.filter(o => o.status === 'finalized').length})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          style={styles.ordersList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Ingen ordrer</Text>
          <Text style={styles.emptyStateMessage}>
            Du har ingen ordrer ennå. Start med å opprette en ny ordre.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.newOrderButton}
        onPress={() => router.push('/')}
      >
        <Text style={styles.newOrderButtonText}>Ny ordre</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  syncButton: {
    backgroundColor: '#065A4D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#065A4D',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  ordersList: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderNumber: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryDate: {
    fontSize: 11,
    color: '#999',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065A4D',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  newOrderButton: {
    backgroundColor: '#065A4D',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  newOrderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})
