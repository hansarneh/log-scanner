import { create } from 'zustand'
import { LocalOrder, LocalOrderItem, LocalProduct, LocalCustomer, database } from '../lib/db'
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
  addManualItem: (ean: string, name: string, price_kr: number, discount_percent?: number, discount_reason?: string, sku?: string) => Promise<void>
  updateItemQty: (itemId: string, qty: number) => Promise<void>
  updateItemDiscount: (itemId: string, discount_percent: number, discount_reason?: string) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateOrderDetails: (customer_name: string, delivery_date?: string) => Promise<void>
  clearOrder: () => void
  finalizeOrder: (note?: string) => Promise<boolean>
  saveDraftOrder: (customer_name: string) => Promise<boolean>
  loadDraftOrder: (orderId: string) => Promise<boolean>
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
      console.log('Starting new order with data:', orderData)
      
      const orderId = await database.createOrder({
        ...orderData,
        status: 'draft'
      })
      
      console.log('Order created with ID:', orderId)
      
      const order = await database.getOrder(orderId)
      if (!order) {
        console.error('Failed to retrieve created order')
        throw new Error('Failed to retrieve created order')
      }
      
      console.log('Retrieved order:', order)
      
      set({
        currentOrder: order,
        orderItems: new Map(),
        lastScannedEAN: null,
        lastScannedProduct: null
      })
      
      console.log('Order state updated successfully')
      return orderId
    } catch (error) {
      console.error('Error starting new order:', error)
      throw error // Re-throw to let caller handle it
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
          sku: product.sku,
          name: product.name,
          qty: 1,
          price_kr: product.price_kr,
          discount_percent: 0,
          discount_reason: undefined
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
        console.log('Product not found for EAN:', ean)
      }
    } catch (error) {
      console.error('Error adding scanned item:', error)
      set({ isLoading: false })
    }
  },

  addManualItem: async (ean: string, name: string, price_kr: number, discount_percent?: number, discount_reason?: string, sku?: string) => {
    const { currentOrder } = get()
    if (!currentOrder) {
      console.error('No current order found when trying to add manual item')
      throw new Error('No active order found')
    }

    try {
      console.log('Adding manual item to order:', currentOrder.id, { ean, name, price_kr, sku })
      
      const itemId = await database.upsertOrderItem({
        order_id: currentOrder.id,
        product_id: undefined, // No product_id for manual items
        ean,
        sku: sku || undefined, // Use provided SKU or undefined
        name,
        qty: 1,
        price_kr,
        discount_percent: discount_percent || 0,
        discount_reason
      })
      
      console.log('Manual item added with ID:', itemId)
      
      // Refresh order items
      const items = await database.getOrderItems(currentOrder.id)
      const itemsMap = new Map(items.map(item => [item.id, item]))
      
      set({
        orderItems: itemsMap,
        lastScannedEAN: ean,
        lastScannedProduct: null
      })
      
      console.log('Order items refreshed, total items:', items.length)
    } catch (error) {
      console.error('Error adding manual item:', error)
      throw error // Re-throw to let caller handle it
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

  updateItemDiscount: async (itemId: string, discount_percent: number, discount_reason?: string) => {
    await database.updateOrderItemDiscount(itemId, discount_percent, discount_reason)
    
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

  updateOrderDetails: async (customer_name: string, delivery_date?: string) => {
    const { currentOrder } = get()
    if (!currentOrder) return

    try {
      // Create or find customer
      let customerId: string | undefined
      const existingCustomer = await database.getCustomerByName(customer_name)
      if (!existingCustomer) {
        const customer: LocalCustomer = {
          id: database.generateUUID(),
          name: customer_name,
          email: currentOrder.customer_email || undefined,
          phone: undefined,
          address: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        await database.upsertCustomer(customer)
        customerId = customer.id
      } else {
        customerId = existingCustomer.id
      }

      await database.updateOrder(currentOrder.id, {
        customer_name,
        delivery_date,
        customer_id: customerId
      })
      
      // Refresh current order
      const updatedOrder = await database.getOrder(currentOrder.id)
      if (updatedOrder) {
        set({ currentOrder: updatedOrder })
      }
    } catch (error) {
      console.error('Error updating order details:', error)
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
        // Always send customer data if customer_name exists, regardless of email
        customer: currentOrder.customer_name ? {
          name: currentOrder.customer_name,
          email: currentOrder.customer_email || undefined,
          phone: undefined // TODO: Add phone field to order if needed
        } : undefined,
        user_email: getAuthStore().user?.email || 'unknown@example.com'
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
        // Create or update customer in local database
        let customerId: string
        console.log('OrderStore: Checking for existing customer:', currentOrder.customer_name)
        const existingCustomer = await database.getCustomerByName(currentOrder.customer_name)
        if (!existingCustomer) {
          console.log('OrderStore: Creating new customer:', currentOrder.customer_name)
          const customer: LocalCustomer = {
            id: database.generateUUID(),
            name: currentOrder.customer_name,
            email: currentOrder.customer_email || undefined,
            phone: undefined,
            address: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          await database.upsertCustomer(customer)
          customerId = customer.id
          console.log('OrderStore: Customer created with ID:', customerId)
        } else {
          customerId = existingCustomer.id
          console.log('OrderStore: Using existing customer ID:', customerId)
        }

        // Update order with customer_id and mark as finalized
        await database.updateOrder(currentOrder.id, { 
          status: 'finalized',
          customer_id: customerId
        })
        
        // Clear current order and items (empty cart)
        set({
          currentOrder: null,
          orderItems: new Map(),
          lastScannedEAN: null,
          lastScannedProduct: null
        })
        
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

  saveDraftOrder: async (customer_name: string) => {
    const { currentOrder } = get()
    if (!currentOrder) {
      console.error('No current order found when trying to save draft')
      return false
    }

    set({ isLoading: true })
    try {
      console.log('OrderStore: Saving draft order with customer:', customer_name)
      
      // Update order with customer name and mark as draft
      await database.updateOrder(currentOrder.id, { 
        customer_name: customer_name,
        status: 'draft'
      })
      
      console.log('OrderStore: Draft order saved successfully')
      return true
    } catch (error) {
      console.error('Error saving draft order:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  loadDraftOrder: async (orderId: string) => {
    set({ isLoading: true })
    try {
      console.log('OrderStore: Loading draft order:', orderId)
      
      // Get order and items from database
      const order = await database.getOrder(orderId)
      const items = await database.getOrderItems(orderId)
      
      if (!order) {
        console.error('Order not found:', orderId)
        return false
      }
      
      // Convert items to Map
      const itemsMap = new Map(items.map(item => [item.id, item]))
      
      // Set as current order
      set({
        currentOrder: order,
        orderItems: itemsMap,
        lastScannedEAN: null,
        lastScannedProduct: null
      })
      
      console.log('OrderStore: Draft order loaded successfully')
      return true
    } catch (error) {
      console.error('Error loading draft order:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  syncDraftOrders: async () => {
    set({ isLoading: true })
    try {
      console.log('OrderStore: Starting order sync...')
      await database.syncOrders()
      console.log('OrderStore: Order sync completed')
    } catch (error) {
      console.error('OrderStore: Error syncing orders:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  getItemCount: () => {
    const { orderItems } = get()
    return Array.from(orderItems.values()).reduce((total, item) => total + item.qty, 0)
  }
}));
