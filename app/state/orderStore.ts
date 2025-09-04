import { create } from 'zustand'
import { LocalOrder, LocalOrderItem, LocalProduct, database } from '../lib/db'
import { productsCache } from '../lib/productsCache'
import { APP_CONFIG } from '../lib/config'
import { FinalizeOrderRequest, OrderItem } from '../../edge/shared/types'

// Import auth store separately to avoid circular dependencies
let authStore: any = null

// Lazy load auth store
const getAuthStore = () => {
  if (!authStore) {
    // Dynamic import to avoid circular dependency
    authStore = require('./authStore').useAuthStore.getState()
  }
  return authStore
}

interface OrderState {
  // Current order
  currentOrder: LocalOrder | null
  orderItems: Map<string, LocalOrderItem>
  
  // UI state
  isLoading: boolean
  lastScannedEAN: string | null
  lastScannedProduct: LocalProduct | null
  
  // Actions
  startNewOrder: (orderData: Omit<LocalOrder, 'id' | 'created_at' | 'status'>) => Promise<string | null>
  addScannedItem: (ean: string) => Promise<void>
  addManualItem: (ean: string, name: string, price_kr: number) => Promise<void>
  updateItemQty: (itemId: string, qty: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearOrder: () => void
  finalizeOrder: (note?: string) => Promise<boolean>
  syncDraftOrders: () => Promise<void>
  
  // Getters
  getItemCount: () => number
}

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: null,
  orderItems: new Map(),
  isLoading: false,
  lastScannedEAN: null,
  lastScannedProduct: null,

  startNewOrder: async (orderData) => {
    try {
      const orderId = await database.createOrder({
        ...orderData,
        status: 'draft'
      })
      
      const order = await database.getOrder(orderId)
      if (!order) {
        console.error('Failed to create order')
        return null
      }
      
      set({
        currentOrder: order,
        orderItems: new Map(),
        lastScannedEAN: null,
        lastScannedProduct: null
      })
      
      return orderId
    } catch (error) {
      console.error('Error starting new order:', error)
      return null
    }
  },

  addScannedItem: async (ean: string) => {
    const { currentOrder } = get()
    if (!currentOrder) return

    set({ isLoading: true })
    
    try {
      // Look up product
      const product = await productsCache.findProductByEAN(ean)
      
      if (product) {
        // Product found - add to order
        const itemId = await database.upsertOrderItem({
          order_id: currentOrder.id,
          product_id: product.id,
          ean: product.ean,
          name: product.name,
          qty: 1,
          price_kr: product.price_kr
        })
        
        // Refresh order items
        const items = await database.getOrderItems(currentOrder.id)
        const itemsMap = new Map(items.map(item => [item.id, item]))
        
        set({
          orderItems: itemsMap,
          lastScannedEAN: ean,
          lastScannedProduct: product,
          isLoading: false
        })
      } else {
        // Product not found - set for manual entry
        set({
          lastScannedEAN: ean,
          lastScannedProduct: null,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('Error adding scanned item:', error)
      set({ isLoading: false })
    }
  },

  addManualItem: async (ean: string, name: string, price_kr: number) => {
    const { currentOrder } = get()
    if (!currentOrder) return

    try {
      const itemId = await database.upsertOrderItem({
        order_id: currentOrder.id,
        ean,
        name,
        qty: 1,
        price_kr
      })
      
      // Refresh order items
      const items = await database.getOrderItems(currentOrder.id)
      const itemsMap = new Map(items.map(item => [item.id, item]))
      
      set({
        orderItems: itemsMap,
        lastScannedEAN: ean,
        lastScannedProduct: null
      })
    } catch (error) {
      console.error('Error adding manual item:', error)
    }
  },

  updateItemQty: async (itemId: string, qty: number) => {
    if (qty <= 0) {
      await get().removeItem(itemId)
      return
    }

    await database.updateOrderItemQty(itemId, qty)
    
    // Refresh order items
    const { currentOrder } = get()
    if (currentOrder) {
      const items = await database.getOrderItems(currentOrder.id)
      const itemsMap = new Map(items.map(item => [item.id, item]))
      set({ orderItems: itemsMap })
    }
  },

  removeItem: async (itemId: string) => {
    await database.deleteOrderItem(itemId)
    
    // Refresh order items
    const { currentOrder } = get()
    if (currentOrder) {
      const items = await database.getOrderItems(currentOrder.id)
      const itemsMap = new Map(items.map(item => [item.id, item]))
      set({ orderItems: itemsMap })
    }
  },

  clearOrder: () => {
    set({
      currentOrder: null,
      orderItems: new Map(),
      lastScannedEAN: null,
      lastScannedProduct: null
    })
  },

  finalizeOrder: async (note?: string) => {
    const { currentOrder, orderItems } = get()
    if (!currentOrder || orderItems.size === 0) return false

    set({ isLoading: true })
    
    try {
      // Update order with note
      if (note) {
        await database.updateOrder(currentOrder.id, { note })
      }

      // Prepare data for edge function
      const items: OrderItem[] = Array.from(orderItems.values()).map(item => ({
        ean: item.ean,
        name: item.name,
        qty: item.qty,
        price_cents: Math.round(item.price_kr * 100) // Convert kr to cents for API
      }))

      const request: FinalizeOrderRequest = {
        order: {
          id: currentOrder.id,
          fair_name: currentOrder.fair_name,
          sales_rep: currentOrder.sales_rep,
          customer_name: currentOrder.customer_name,
          customer_email: currentOrder.customer_email,
          note: note || currentOrder.note
        },
        items,
        customer: currentOrder.customer_email ? {
          name: currentOrder.customer_name,
          email: currentOrder.customer_email
        } : undefined,
        user_email: getAuthStore().user?.email || 'unknown@example.com',
        user_fair_name: getAuthStore().user?.fair_name
      }

      // Call edge function
      const response = await fetch(`${APP_CONFIG.EDGE_FUNCTION_URL}/finalize-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${APP_CONFIG.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Mark order as finalized in local database
        await database.updateOrder(currentOrder.id, { status: 'finalized' })
        return true
      } else {
        console.error('Edge function failed:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error finalizing order:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  syncDraftOrders: async () => {
    // This method would sync draft orders with the server
    // For now, it's a placeholder
    console.log('syncDraftOrders called')
  },

  getItemCount: () => {
    const { orderItems } = get()
    return Array.from(orderItems.values()).reduce((total, item) => total + item.qty, 0)
  }
}));
