import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'

export interface LocalProduct {
  id: string
  ean: string
  sku?: string
  name: string
  price_kr: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface LocalOrder {
  id: string
  order_number?: number
  fair_name?: string
  sales_rep?: string
  customer_name: string
  customer_email?: string
  customer_id?: string
  delivery_date?: string
  note?: string
  status: 'draft' | 'finalized' | 'sync_error'
  created_at: string
  synced_at?: string
}

export interface LocalOrderItem {
  id: string
  order_id: string
  product_id?: string
  ean: string
  sku?: string
  name: string
  qty: number
  price_kr: number
  discount_percent: number
  discount_reason?: string
  created_at: string
}

export interface LocalCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}

class Database {
  private db!: SQLite.SQLiteDatabase

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  async getNextOrderNumber(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT MAX(order_number) as max_number FROM orders WHERE order_number IS NOT NULL',
          [],
          (_, result) => {
            const maxNumber = result.rows.length > 0 ? result.rows.item(0).max_number : null
            const nextNumber = maxNumber ? maxNumber + 1 : 1001
            resolve(nextNumber)
          },
          (_, error) => {
            console.error('Database: Error getting next order number:', error)
            reject(error)
            return false
          }
        )
      })
    })
  }

  constructor() {
    try {
      console.log('Database: Opening database...')
      this.db = SQLite.openDatabase('fairscanner.db')
      console.log('Database: Database opened successfully')
      this.init()
    } catch (error) {
      console.error('Database: Error opening database:', error)
      // Don't crash, try to continue
    }
  }

  private init() {
    try {
      console.log('Database: Starting initialization...')
      this.db.transaction(
        tx => {
          console.log('Database: Creating tables...')
          
          // Test if database is working
          tx.executeSql('SELECT 1', [], 
            () => console.log('Database: Connection test successful'),
            (_, error) => {
              console.error('Database: Connection test failed:', error)
              return false
            }
          )
          // Create products table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS products (
              id TEXT PRIMARY KEY,
              ean TEXT UNIQUE NOT NULL,
              sku TEXT,
              name TEXT NOT NULL,
              price_kr REAL NOT NULL DEFAULT 0.00,
              active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `, [], 
            () => console.log('Database: Products table created'),
            (_, error) => {
              console.error('Database: Error creating products table:', error)
              return false
            }
          )

          // Create customers table FIRST (before orders due to foreign key)
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS customers (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT,
              phone TEXT,
              address TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `, [], 
            () => console.log('Database: Customers table created'),
            (_, error) => {
              console.error('Database: Error creating customers table:', error)
              return false
            }
          )

          // Create orders table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS orders (
              id TEXT PRIMARY KEY,
              order_number INTEGER,
              fair_name TEXT,
              sales_rep TEXT,
              customer_name TEXT NOT NULL,
              customer_email TEXT,
              customer_id TEXT,
              delivery_date TEXT,
              note TEXT,
              status TEXT NOT NULL DEFAULT 'draft',
              created_at TEXT NOT NULL,
              synced_at TEXT,
              FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
          `, [], 
            () => console.log('Database: Orders table created'),
            (_, error) => {
              console.error('Database: Error creating orders table:', error)
              return false
            }
          )

          // Create order_items table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS order_items (
              id TEXT PRIMARY KEY,
              order_id TEXT NOT NULL,
              product_id TEXT,
              ean TEXT NOT NULL,
              sku TEXT,
              name TEXT NOT NULL,
              qty INTEGER NOT NULL DEFAULT 1,
              price_kr REAL NOT NULL,
              discount_percent REAL NOT NULL DEFAULT 0.00,
              discount_reason TEXT,
              created_at TEXT NOT NULL,
              FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
          `, [], 
            () => console.log('Database: Order_items table created'),
            (_, error) => {
              console.error('Database: Error creating order_items table:', error)
              return false
            }
          )

          // Create indexes
          tx.executeSql('CREATE INDEX IF NOT EXISTS products_ean_idx ON products(ean)')
          tx.executeSql('CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id)')
          tx.executeSql('CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)')
          tx.executeSql('CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name)')
          
          // Migration: Add discount columns to existing order_items table (ignore errors if columns already exist)
          tx.executeSql('ALTER TABLE order_items ADD COLUMN discount_percent REAL DEFAULT 0.00', [], () => {}, () => false)
          tx.executeSql('ALTER TABLE order_items ADD COLUMN discount_reason TEXT', [], () => {}, () => false)
          tx.executeSql('ALTER TABLE order_items ADD COLUMN sku TEXT', [], () => {}, () => false)
          tx.executeSql('ALTER TABLE orders ADD COLUMN delivery_date TEXT', [], () => {}, () => false)
          tx.executeSql('ALTER TABLE orders ADD COLUMN customer_id TEXT', [], () => {}, () => false)
          tx.executeSql('ALTER TABLE orders ADD COLUMN order_number INTEGER', [], () => {}, () => false)
          
          console.log('Database: Tables created successfully')
        },
        error => {
          console.error('Database: Transaction error during init:', error)
        },
        () => {
          console.log('Database: Initialization completed successfully')
        }
      )
    } catch (error) {
      console.error('Database: Error during initialization:', error)
      // Don't crash, try to continue
    }
  }

  // Product methods
  async upsertProducts(products: LocalProduct[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        products.forEach(product => {
          tx.executeSql(
            `INSERT OR REPLACE INTO products (id, ean, sku, name, price_kr, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [product.id, product.ean, product.sku || null, product.name, product.price_kr, product.active ? 1 : 0, product.created_at, product.updated_at]
          )
        })
      }, reject, resolve)
    })
  }

  async findProductByEAN(ean: string): Promise<LocalProduct | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM products WHERE ean = ? AND active = 1',
          [ean],
          (_, result) => {
            if (result.rows.length > 0) {
              const row = result.rows.item(0)
              resolve({
                ...row,
                active: Boolean(row.active)
              })
            } else {
              resolve(null)
            }
          },
          (_, error) => {
            reject(error)
            return false
          }
        )
      })
    })
  }

  async getAllProducts(): Promise<LocalProduct[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM products WHERE active = 1 ORDER BY name',
          [],
          (_, result) => {
            const products: LocalProduct[] = []
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i)
              products.push({
                ...row,
                active: Boolean(row.active)
              })
            }
            resolve(products)
          },
          (_, error) => {
            reject(error)
            return false
          }
        )
      })
    })
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    const searchTerm = `%${query.toLowerCase()}%`
    
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM products 
           WHERE active = 1 
           AND (LOWER(name) LIKE ? OR LOWER(ean) LIKE ? OR LOWER(sku) LIKE ?)
           ORDER BY name
           LIMIT 50`,
          [searchTerm, searchTerm, searchTerm],
          (_, result) => {
            const products: LocalProduct[] = []
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i)
              products.push({
                ...row,
                active: Boolean(row.active)
              })
            }
            resolve(products)
          },
          (_, error) => {
            reject(error)
            return false
          }
        )
      })
    })
  }

  // Order methods
  async createOrder(order: Omit<LocalOrder, 'id' | 'created_at'>): Promise<string> {
    const id = this.generateUUID()
    const order_number = await this.getNextOrderNumber()
    const created_at = new Date().toISOString()

    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO orders (id, order_number, fair_name, sales_rep, customer_name, customer_email, customer_id, delivery_date, note, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, order_number, order.fair_name || null, order.sales_rep || null, order.customer_name, order.customer_email || null, order.customer_id || null, order.delivery_date || null, order.note || null, order.status, created_at]
        )
      }, reject, () => resolve(id))
    })
  }

  async updateOrder(id: string, updates: Partial<LocalOrder>): Promise<void> {
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const values = Object.values(updates)
    
    if (fields.length === 0) return

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `UPDATE orders SET ${setClause} WHERE id = ?`,
          [...values, id]
        )
      }, reject, resolve)
    })
  }

  async getOrder(id: string): Promise<LocalOrder | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM orders WHERE id = ?',
          [id],
          (_, result) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0))
            } else {
              resolve(null)
            }
          },
          (_, error) => {
            reject(error)
            return false
          }
        )
      })
    })
  }

  async getDraftOrders(): Promise<LocalOrder[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          "SELECT * FROM orders WHERE status = 'draft' ORDER BY created_at DESC",
          [],
          (_, result) => {
            const orders: LocalOrder[] = []
            for (let i = 0; i < result.rows.length; i++) {
              orders.push(result.rows.item(i))
            }
            resolve(orders)
          },
          (_, error) => {
            reject(error)
            return false
          }
        )
      })
    })
  }

  async getAllOrders(): Promise<LocalOrder[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          "SELECT * FROM orders ORDER BY created_at DESC",
          [],
          (_, result) => {
            const orders: LocalOrder[] = []
            for (let i = 0; i < result.rows.length; i++) {
              orders.push(result.rows.item(i))
            }
            resolve(orders)
          },
          (_, error) => {
            console.error('Database: Error getting all orders:', error)
            reject(error)
            return false
          }
        )
      })
    })
  }

  // Order items methods
  async upsertOrderItem(item: Omit<LocalOrderItem, 'id' | 'created_at'>): Promise<string> {
    const id = this.generateUUID()
    const created_at = new Date().toISOString()

    return new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          // Check if item with same EAN already exists
          tx.executeSql(
            'SELECT id, qty FROM order_items WHERE order_id = ? AND ean = ?',
            [item.order_id, item.ean],
            (_, result) => {
              if (result.rows.length > 0) {
                // Update quantity
                const existingItem = result.rows.item(0)
                const newQty = existingItem.qty + item.qty
                tx.executeSql(
                  'UPDATE order_items SET qty = ? WHERE id = ?',
                  [newQty, existingItem.id],
                  () => {
                    console.log('Order item quantity updated successfully')
                    resolve(existingItem.id)
                  },
                  (_, error) => {
                    console.error('Database: Error updating order item quantity:', error)
                    reject(error)
                    return false
                  }
                )
              } else {
                // Insert new item
                tx.executeSql(
                  `INSERT INTO order_items (id, order_id, product_id, ean, sku, name, qty, price_kr, discount_percent, discount_reason, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [id, item.order_id, item.product_id || null, item.ean, item.sku || null, item.name, item.qty, item.price_kr, item.discount_percent || 0, item.discount_reason || null, created_at],
                  () => {
                    console.log('Order item inserted successfully with created_at:', created_at)
                    resolve(id)
                  },
                  (_, error) => {
                    console.error('Database: Error inserting order item:', error)
                    reject(error)
                    return false
                  }
                )
              }
            },
            (_, error) => {
              console.error('Database: Error selecting order item:', error)
              reject(error)
              return false
            }
          )
        },
        error => {
          console.error('Database: Transaction error in upsertOrderItem:', error)
          reject(error)
        },
        () => {
          console.log('Database: upsertOrderItem transaction completed successfully')
        }
      )
    })
  }

  async getOrderItems(orderId: string): Promise<LocalOrderItem[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC',
          [orderId],
          (_, result) => {
            const items: LocalOrderItem[] = []
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i)
              items.push({
                ...row,
                sku: row.sku || undefined,
                discount_percent: row.discount_percent || 0,
                discount_reason: row.discount_reason || undefined
              })
            }
            resolve(items)
          },
          (_, error) => {
            reject(error)
            return false
          }
        )
      })
    })
  }

  async getOrderTotal(orderId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT SUM((price_kr * qty) * (1 - discount_percent / 100.0)) as total FROM order_items WHERE order_id = ?',
          [orderId],
          (_, result) => {
            const total = result.rows.length > 0 ? result.rows.item(0).total : 0
            resolve(total || 0)
          },
          (_, error) => {
            console.error('Database: Error calculating order total:', error)
            reject(error)
            return false
          }
        )
      })
    })
  }

  async updateOrderItemQty(id: string, qty: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'UPDATE order_items SET qty = ? WHERE id = ?',
          [qty, id]
        )
      }, reject, resolve)
    })
  }

  async updateOrderItemDiscount(id: string, discount_percent: number, discount_reason?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'UPDATE order_items SET discount_percent = ?, discount_reason = ? WHERE id = ?',
          [discount_percent, discount_reason || null, id]
        )
      }, reject, resolve)
    })
  }

  async deleteOrderItem(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql('DELETE FROM order_items WHERE id = ?', [id])
      }, reject, resolve)
    })
  }

  async clearOrderItems(orderId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql('DELETE FROM order_items WHERE order_id = ?', [orderId])
      }, reject, resolve)
    })
  }

  // Customer methods
  async upsertCustomer(customer: LocalCustomer): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Database: Upserting customer:', customer.name, 'with ID:', customer.id)
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO customers 
           (id, name, email, phone, address, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            customer.id,
            customer.name,
            customer.email || null,
            customer.phone || null,
            customer.address || null,
            customer.created_at,
            customer.updated_at
          ],
          () => {
            console.log('Database: Customer upserted successfully:', customer.name)
            resolve()
          },
          (_, error) => {
            console.error('Database: Error upserting customer:', error)
            reject(error)
            return false
          }
        )
      }, reject, resolve)
    })
  }

  async getCustomerByName(name: string): Promise<LocalCustomer | null> {
    return new Promise((resolve, reject) => {
      console.log('Database: Looking for customer by name:', name)
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM customers WHERE name = ? LIMIT 1',
          [name],
          (_, { rows }) => {
            if (rows.length > 0) {
              const row = rows.item(0)
              console.log('Database: Found existing customer:', row.name, 'with ID:', row.id)
              resolve({
                id: row.id,
                name: row.name,
                email: row.email || undefined,
                phone: row.phone || undefined,
                address: row.address || undefined,
                created_at: row.created_at,
                updated_at: row.updated_at
              })
            } else {
              console.log('Database: No existing customer found for name:', name)
              resolve(null)
            }
          },
          (_, error) => {
            console.error('Database: Error looking up customer:', error)
            reject(error)
            return false
          }
        )
      })
    })
  }

  async syncOrders(): Promise<void> {
    try {
      console.log('Database: Starting order sync from Supabase...')
      
      // Import supabase here to avoid circular dependency
      const { supabase } = require('./supabase')
      
      // Get all orders from Supabase
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Database: Error fetching orders from Supabase:', ordersError)
        return
      }

      if (!orders || orders.length === 0) {
        console.log('Database: No orders found in Supabase')
        return
      }

      console.log(`Database: Found ${orders.length} orders in Supabase`)

      // Get all order items from Supabase
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')

      if (itemsError) {
        console.error('Database: Error fetching order items from Supabase:', itemsError)
        return
      }

      // Group order items by order_id
      const itemsByOrderId = new Map<string, any[]>()
      if (orderItems) {
        orderItems.forEach(item => {
          if (!itemsByOrderId.has(item.order_id)) {
            itemsByOrderId.set(item.order_id, [])
          }
          itemsByOrderId.get(item.order_id)!.push(item)
        })
      }

      // Sync orders to local database
      for (const order of orders) {
        try {
          // Convert Supabase order to local format
          const localOrder: LocalOrder = {
            id: order.id,
            order_number: order.order_number || undefined,
            fair_name: order.fair_name || undefined,
            sales_rep: order.sales_rep || undefined,
            customer_id: order.customer_id || undefined,
            customer_name: order.customer_name,
            customer_email: order.customer_email || undefined,
            note: order.note || undefined,
            status: order.status,
            created_at: order.created_at,
            synced_at: order.synced_at || undefined
          }

          // Upsert order
          await this.upsertOrder(localOrder)

          // Sync order items
          const items = itemsByOrderId.get(order.id) || []
          for (const item of items) {
            const localItem: LocalOrderItem = {
              id: item.id,
              order_id: item.order_id,
              product_id: item.product_id || undefined,
              ean: item.ean,
              sku: item.sku || undefined,
              name: item.name,
              qty: item.qty,
              price_kr: item.price_kr,
              discount_percent: item.discount_percent || 0,
              discount_reason: item.discount_reason || undefined,
              created_at: item.created_at
            }

            await this.upsertOrderItemFromSync(localItem)
          }

          console.log(`Database: Synced order ${order.id} with ${items.length} items`)
        } catch (error) {
          console.error(`Database: Error syncing order ${order.id}:`, error)
        }
      }

      console.log('Database: Order sync completed successfully')
    } catch (error) {
      console.error('Database: Error during order sync:', error)
    }
  }

  private async upsertOrder(order: LocalOrder): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO orders 
           (id, order_number, fair_name, sales_rep, customer_id, customer_name, customer_email, note, status, created_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.id,
            order.order_number || null,
            order.fair_name || null,
            order.sales_rep || null,
            order.customer_id || null,
            order.customer_name,
            order.customer_email || null,
            order.note || null,
            order.status,
            order.created_at,
            order.synced_at || null
          ],
          () => resolve(),
          (_, error) => {
            console.error('Database: Error upserting order:', error)
            reject(error)
            return false
          }
        )
      })
    })
  }

  private async upsertOrderItemFromSync(item: LocalOrderItem): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Ensure created_at is always set - use current time if not provided
        const created_at = item.created_at || new Date().toISOString()
        
        tx.executeSql(
          `INSERT OR REPLACE INTO order_items 
           (id, order_id, product_id, ean, sku, name, qty, price_kr, discount_percent, discount_reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.order_id,
            item.product_id || null,
            item.ean,
            item.sku || null,
            item.name,
            item.qty,
            item.price_kr,
            item.discount_percent || 0,
            item.discount_reason || null,
            created_at
          ],
          () => resolve(),
          (_, error) => {
            console.error('Database: Error upserting order item:', error)
            reject(error)
            return false
          }
        )
      })
    })
  }
}

export const database = new Database()
