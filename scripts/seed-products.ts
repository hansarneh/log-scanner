#!/usr/bin/env tsx

/**
 * Seed Products Script
 * 
 * This script populates the Supabase database with sample products.
 * Run with: npm run seed
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Product {
  ean: string
  sku: string
  name: string
  price_kr: number
  active: boolean
}

const sampleProducts: Product[] = [
  {
    ean: '4007817327320',
    sku: 'SKU001',
    name: 'Industrial Pump 2000',
    price_kr: 150.00,
    active: true
  },
  {
    ean: '4007817327321',
    sku: 'SKU002',
    name: 'Hydraulic Valve Set',
    price_kr: 85.00,
    active: true
  },
  {
    ean: '4007817327322',
    sku: 'SKU003',
    name: 'Steel Pipe 2m',
    price_kr: 12.00,
    active: true
  },
  {
    ean: '4007817327323',
    sku: 'SKU004',
    name: 'Control Panel Basic',
    price_kr: 250.00,
    active: true
  },
  {
    ean: '4007817327324',
    sku: 'SKU005',
    name: 'Solenoid Actuator',
    price_kr: 32.00,
    active: true
  },
  {
    ean: '4007817327325',
    sku: 'SKU006',
    name: 'Pressure Sensor',
    price_kr: 18.00,
    active: true
  },
  {
    ean: '4007817327326',
    sku: 'SKU007',
    name: 'Flow Meter Digital',
    price_kr: 42.00,
    active: true
  },
  {
    ean: '4007817327327',
    sku: 'SKU008',
    name: 'Motor Mount Bracket',
    price_kr: 9.50,
    active: true
  },
  {
    ean: '4007817327328',
    sku: 'SKU009',
    name: 'Seal Kit Standard',
    price_kr: 7.50,
    active: true
  },
  {
    ean: '4007817327329',
    sku: 'SKU010',
    name: 'Filter Element 10μm',
    price_kr: 4.50,
    active: true
  },
  {
    ean: '4007817327330',
    sku: 'SKU011',
    name: 'Gearbox Assembly',
    price_kr: 150.00,
    active: true
  },
  {
    ean: '4007817327331',
    sku: 'SKU012',
    name: 'Coupling Flexible',
    price_kr: 28.00,
    active: true
  },
  {
    ean: '4007817327332',
    sku: 'SKU013',
    name: 'Bearing Set',
    price_kr: 12.00,
    active: true
  },
  {
    ean: '4007817327333',
    sku: 'SKU014',
    name: 'Shaft Extension',
    price_kr: 8.50,
    active: true
  },
  {
    ean: '4007817327334',
    sku: 'SKU015',
    name: 'Mounting Plate',
    price_kr: 6.50,
    active: true
  },
  {
    ean: '4007817327335',
    sku: 'SKU016',
    name: 'Electrical Connector',
    price_kr: 3.50,
    active: true
  },
  {
    ean: '4007817327336',
    sku: 'SKU017',
    name: 'Cable Gland',
    price_kr: 1.80,
    active: true
  },
  {
    ean: '4007817327337',
    sku: 'SKU018',
    name: 'Terminal Block',
    price_kr: 4.20,
    active: true
  },
  {
    ean: '4007817327338',
    sku: 'SKU019',
    name: 'LED Indicator',
    price_kr: 1.20,
    active: true
  },
  {
    ean: '4007817327339',
    sku: 'SKU020',
    name: 'Push Button',
    price_kr: 0.95,
    active: true
  }
]

async function seedProducts() {
  console.log('🌱 Seeding products...')
  
  try {
    // Check if products table exists and has data
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('count')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Error checking products table:', checkError)
      process.exit(1)
    }
    
    if (existingProducts && existingProducts.length > 0) {
      console.log('⚠️  Products table already has data. Skipping seed.')
      return
    }
    
    // Insert products
    const { data, error } = await supabase
      .from('products')
      .insert(sampleProducts)
      .select()
    
    if (error) {
      console.error('❌ Error inserting products:', error)
      process.exit(1)
    }
    
    console.log(`✅ Successfully seeded ${data.length} products`)
    
    // Display some sample products
    console.log('\n📋 Sample products:')
    data.slice(0, 5).forEach(product => {
      console.log(`   ${product.ean} - ${product.name} (kr ${(product.price_kr).toFixed(2)})`)
    })
    
    if (data.length > 5) {
      console.log(`   ... and ${data.length - 5} more`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

async function main() {
  console.log('🚀 Fair Scanner - Database Seeding')
  console.log('=====================================')
  
  await seedProducts()
  
  console.log('\n✅ Seeding complete!')
  console.log('\nYou can now test the app with these sample products.')
}

main().catch(console.error)
