import { supabase } from './supabase'
import { database, LocalProduct } from './db'
import { Product } from '../../edge/shared/types'

export class ProductsCache {
  private static instance: ProductsCache
  private lastSync: Date | null = null
  private syncInterval = 1000 * 60 * 60 // 1 hour

  static getInstance(): ProductsCache {
    if (!ProductsCache.instance) {
      ProductsCache.instance = new ProductsCache()
    }
    return ProductsCache.instance
  }

  async syncProducts(): Promise<void> {
    try {
      // Check if we need to sync based on time interval
      if (this.lastSync && (Date.now() - this.lastSync.getTime()) < this.syncInterval) {
        console.log('Skipping sync - within sync interval')
        return
      }

      console.log('Syncing products from Supabase...')
      
      // Get the latest updated_at timestamp from local database
      const localLastUpdate = await this.getLastLocalProductUpdate()
      
      // If we have a lastUpdate, do incremental sync (only changed products)
      if (localLastUpdate) {
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .gt('updated_at', localLastUpdate.toISOString())

        if (error) {
          console.error('Error fetching updated products:', error)
          return
        }

        if (products && products.length > 0) {
          // Convert to local format
          const localProducts: LocalProduct[] = products.map(product => ({
            id: product.id,
            ean: product.ean,
            sku: product.sku,
            name: product.name,
            price_kr: product.price_kr,
            active: product.active,
            created_at: product.created_at,
            updated_at: product.updated_at
          }))

          // Store in local database
          await database.upsertProducts(localProducts)
          this.lastSync = new Date()
          
          console.log(`Synced ${products.length} updated products`)
        } else {
          console.log('No new product updates found')
          this.lastSync = new Date()
        }
      } else {
        // No lastUpdate means first sync - get ALL products with pagination
        console.log('First sync - fetching all products with pagination...')
        
        let allProducts: any[] = []
        let page = 0
        const pageSize = 1000 // Supabase default limit
        let hasMore = true
        
        while (hasMore) {
          const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (error) {
            console.error('Error fetching products page', page, ':', error)
            break
          }

          if (products && products.length > 0) {
            allProducts.push(...products)
            page++
            
            // If we got less than pageSize, we've reached the end
            if (products.length < pageSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        if (allProducts.length > 0) {
          // Convert to local format
          const localProducts: LocalProduct[] = allProducts.map(product => ({
            id: product.id,
            ean: product.ean,
            sku: product.sku,
            name: product.name,
            price_kr: product.price_kr,
            active: product.active,
            created_at: product.created_at,
            updated_at: product.updated_at
          }))

          // Store in local database
          await database.upsertProducts(localProducts)
          this.lastSync = new Date()
          
          console.log(`Initial sync: ${allProducts.length} products across ${page} pages`)
        }
      }
    } catch (error) {
      console.error('Error syncing products:', error)
    }
  }

  private async getLastLocalProductUpdate(): Promise<Date | null> {
    try {
      const products = await database.getAllProducts()
      if (products.length === 0) return null
      
      // Find the most recent updated_at timestamp
      const latestUpdate = products.reduce((latest, product) => {
        const productUpdate = new Date(product.updated_at)
        return productUpdate > latest ? productUpdate : latest
      }, new Date(0))
      
      return latestUpdate.getTime() > 0 ? latestUpdate : null
    } catch (error) {
      console.error('Error getting last local product update:', error)
      return null
    }
  }

  async findProductByEAN(ean: string): Promise<LocalProduct | null> {
    // First try local database
    let product = await database.findProductByEAN(ean)
    
    if (!product) {
      // If not found locally, try to sync and search again
      await this.syncProducts()
      product = await database.findProductByEAN(ean)
    }
    
    return product
  }

  async getAllProducts(): Promise<LocalProduct[]> {
    // Only sync if we haven't synced recently
    await this.syncProducts()
    return database.getAllProducts()
  }

  async forceSync(): Promise<void> {
    this.lastSync = null
    await this.syncProducts()
  }

  async getProductCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
      
      if (error) {
        console.error('Error getting product count:', error)
        return 0
      }
      
      return count || 0
    } catch (error) {
      console.error('Error getting product count:', error)
      return 0
    }
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    // First try local database search
    const localProducts = await database.searchProducts(query)
    
    if (localProducts.length > 0) {
      return localProducts
    }
    
    // If no local results, try to sync and search again
    await this.syncProducts()
    return await database.searchProducts(query)
  }
}

export const productsCache = ProductsCache.getInstance()
