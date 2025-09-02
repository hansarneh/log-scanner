import { create } from 'zustand'
import { LocalOrder, LocalOrderItem, database } from '../lib/db'
import { productsCache, LocalProduct } from '../lib/productsCache'
import { supabase } from '../lib/supabase'
import { FinalizeOrderRequest, OrderItem } from '../../edge/shared/types'

interface OrderState {
  // Current order
  currentOrder: LocalOrder | null
  orderItems: Map<string, LocalOrderItem>
  
  // UI state
  isLoading: boolean
  lastScannedEAN: string | null
  lastScannedProduct: LocalProduct | null
  
  // Actions
  startNewOrder: (orderData: Omit<LocalOrder, 'id' | 'created_at' | 'status'>) => Promise<string>
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
    const orderId = await database.createOrder({
      ...orderData,
      status: 'draft'
    })
    
    const order = await database.getOrder(orderId)
    if (!order) throw new Error('Failed to create order')
    
    set({
      currentOrder: order,
      orderItems: new Map(),
      lastScannedEAN: null,
      lastScannedProduct: null
    })
    
    return orderId
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
        } : undefined
      }

      // Call edge function
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/finalize-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Update local order status
        await database.updateOrder(currentOrder.id, { 
          status: 'finalized',
          synced_at: new Date().toISOString()
        })
        
        // Clear current order
        get().clearOrder()
        
        set({ isLoading: false })
        return true
      } else {
        throw new Error(result.error || 'Failed to finalize order')
      }
    } catch (error) {
      console.error('Error finalizing order:', error)
      
      // Mark order as sync error
      if (currentOrder) {
        await database.updateOrder(currentOrder.id, { status: 'sync_error' })
      }
      
      set({ isLoading: false })
      return false
    }
  },

  syncDraftOrders: async () => {
    set({ isLoading: true })
    
    try {
      const draftOrders = await database.getDraftOrders()
      
      for (const order of draftOrders) {
        if (order.status === 'draft') {
          // Try to finalize each draft order
          const success = await get().finalizeOrder(order.note)
          if (success) {
            console.log(`Synced order ${order.id}`)
          }
        }
      }
    } catch (error) {
      console.error('Error syncing draft orders:', error)
    } finally {
      set({ isLoading: false })
    }
  },



  getItemCount: () => {
    const { orderItems } = get()
    let count = 0
    orderItems.forEach(item => {
      count += item.qty
    })
    return count
  }
}))
