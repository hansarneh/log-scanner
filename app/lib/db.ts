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
  fair_name?: string
  sales_rep?: string
  customer_name: string
  customer_email?: string
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
  name: string
  qty: number
  price_kr: number
  created_at: string
}

class Database {
  private db: SQLite.SQLiteDatabase

  constructor() {
    this.db = SQLite.openDatabase('fairscanner.db')
    this.init()
  }

  private init() {
    this.db.transaction(tx => {
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
      `)

      // Create orders table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          fair_name TEXT,
          sales_rep TEXT,
          customer_name TEXT NOT NULL,
          customer_email TEXT,
          note TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TEXT NOT NULL,
          synced_at TEXT
        )
      `)

      // Create order_items table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          product_id TEXT,
          ean TEXT NOT NULL,
          name TEXT NOT NULL,
          qty INTEGER NOT NULL DEFAULT 1,
          price_kr REAL NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
      `)

      // Create indexes
      tx.executeSql('CREATE INDEX IF NOT EXISTS products_ean_idx ON products(ean)')
      tx.executeSql('CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id)')
      tx.executeSql('CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)')
    })
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

  // Order methods
  async createOrder(order: Omit<LocalOrder, 'id' | 'created_at'>): Promise<string> {
    const id = crypto.randomUUID()
    const created_at = new Date().toISOString()

    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO orders (id, fair_name, sales_rep, customer_name, customer_email, note, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, order.fair_name || null, order.sales_rep || null, order.customer_name, order.customer_email || null, order.note || null, order.status, created_at]
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

  // Order items methods
  async upsertOrderItem(item: Omit<LocalOrderItem, 'id' | 'created_at'>): Promise<string> {
    const id = crypto.randomUUID()
    const created_at = new Date().toISOString()

    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
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
                [newQty, existingItem.id]
              )
              resolve(existingItem.id)
            } else {
              // Insert new item
              tx.executeSql(
                `INSERT INTO order_items (id, order_id, product_id, ean, name, qty, price_kr, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, item.order_id, item.product_id || null, item.ean, item.name, item.qty, item.price_kr, created_at]
              )
              resolve(id)
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

  async getOrderItems(orderId: string): Promise<LocalOrderItem[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC',
          [orderId],
          (_, result) => {
            const items: LocalOrderItem[] = []
            for (let i = 0; i < result.rows.length; i++) {
              items.push(result.rows.item(i))
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
}

export const database = new Database()
