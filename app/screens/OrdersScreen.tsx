import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOrderStore } from '../state/orderStore'
import { database, LocalOrder } from '../lib/db'
import { productsCache } from '../lib/productsCache'

export default function OrdersScreen() {
  const router = useRouter()
  const { syncDraftOrders, isLoading } = useOrderStore()
  
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadOrders()
    // Initial products sync
    productsCache.syncProducts()
  }, [])

  const loadOrders = async () => {
    try {
      const allOrders = await database.getDraftOrders()
      setOrders(allOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadOrders()
    await productsCache.forceSync()
    setRefreshing(false)
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

  const renderOrder = ({ item }: { item: LocalOrder }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString('nb-NO')}
          </Text>
          {item.fair_name && (
            <Text style={styles.fairName}>{item.fair_name}</Text>
          )}
        </View>
        
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(item.status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </View>
      
      {item.sales_rep && (
        <Text style={styles.salesRep}>Selger: {item.sales_rep}</Text>
      )}
      
      {item.note && (
        <Text style={styles.note} numberOfLines={2}>
          Notat: {item.note}
        </Text>
      )}
      
      <Text style={styles.orderId}>ID: {item.id}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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

      {orders.length > 0 ? (
        <FlatList
          data={orders}
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
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  syncButton: {
    backgroundColor: '#007AFF',
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
  ordersList: {
    flex: 1,
  },
  orderCard: {
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 16,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fairName: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'flex-end',
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
  salesRep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
    backgroundColor: '#007AFF',
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
