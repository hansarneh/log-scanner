import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type definitions (included directly to avoid import path issues)
interface Customer {
  name: string;
  email?: string;
  phone?: string;
}

interface OrderItem {
  ean: string;
  sku?: string;
  name: string;
  qty: number;
  price_cents: number;
}

interface Order {
  id: string;
  fair_name?: string;
  sales_rep?: string;
  customer_name: string;
  customer_email?: string;
  note?: string;
}

interface FinalizeOrderRequest {
  order: Order;
  items: OrderItem[];
  customer?: Customer;
}

interface FinalizeOrderResponse {
  success: boolean;
  order_id: string;
  csv_url?: string;
  message?: string;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('PROJECT_URL')
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')
    const fallbackEmail = Deno.env.get('ORDERS_FALLBACK_TO')
    const ccEmail = Deno.env.get('ORDERS_CC')
    const fairName = Deno.env.get('FAIR_NAME') || 'Trade Fair'

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    if (!fallbackEmail) {
      throw new Error('Missing fallback email configuration')
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body: FinalizeOrderRequest = await req.json()
    const { order, items, customer } = body

    if (!order || !items || items.length === 0) {
      throw new Error('Invalid request: missing order or items')
    }

    // 1. Upsert customer if provided
    let customerId: string | null = null
    if (customer && customer.email) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customer.email)
        .single()

      if (existingCustomer) {
        customerId = existingCustomer.id
        // Update customer info
        await supabase
          .from('customers')
          .update({
            name: customer.name,
            phone: customer.phone
          })
          .eq('id', customerId)
      } else {
        // Insert new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customer.name,
            email: customer.email,
            phone: customer.phone
          })
          .select('id')
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
      }
    }

    // 2. Upsert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert({
        id: order.id,
        fair_name: order.fair_name || fairName,
        sales_rep: order.sales_rep,
        customer_id: customerId,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        note: order.note,
        status: 'finalized',
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 3. Replace order items
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', order.id)

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items.map(item => ({
        order_id: order.id,
        product_id: null, // We don't link to products table in this implementation
        ean: item.ean,
        name: item.name,
        qty: item.qty,
        price_kr: item.price_cents / 100, // Convert cents back to kr for database
        created_at: new Date().toISOString()
      })))

    if (itemsError) throw itemsError

    // 4. Generate CSV
    const csvContent = generateCSV(items)
    const csvBuffer = new TextEncoder().encode(csvContent)

    // 5. Upload to Storage
    const fileName = `orders/${order.id}.csv`
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(fileName, csvBuffer, {
        contentType: 'text/csv',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 6. Create signed URL (7 days)
    const { data: signedUrlData } = await supabase.storage
      .from('exports')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60)

    // 7. Send email (placeholder - logs to console in Deno)
    const emailData = {
      to: order.customer_email || fallbackEmail,
      cc: ccEmail,
      subject: `Order ${order.id} - ${fairName}`,
      body: `Your order has been finalized.\n\nOrder ID: ${order.id}\nCustomer: ${order.customer_name}\nItems: ${items.length}\n\nDownload CSV: ${signedUrlData?.signedUrl || 'N/A'}`,
      attachment: btoa(csvContent)
    }

    console.log('Email would be sent:', JSON.stringify(emailData, null, 2))

    const response: FinalizeOrderResponse = {
      success: true,
      order_id: order.id,
      csv_url: signedUrlData?.signedUrl,
      message: 'Order finalized successfully'
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in finalize-order:', error)
    
    const errorResponse: FinalizeOrderResponse = {
      success: false,
      order_id: '',
      error: error.message
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function generateCSV(items: any[]): string {
  const headers = ['EAN', 'SKU', 'Name', 'Qty', 'Price', 'LineTotal', 'TotalIncVAT', 'VAT']
  const csvRows = items.map(item => {
    const lineTotal = item.qty * item.price_cents
    const totalIncVAT = Math.round(lineTotal)
    
    return [
      item.ean,
      item.sku || '',
      item.name,
      item.qty.toString(),
      (item.price_cents / 100).toFixed(2),
      (lineTotal / 100).toFixed(2),
      (totalIncVAT / 100).toFixed(2),
      '0%'
    ].join(',')
  })

  return [headers.join(','), ...csvRows].join('\n')
}
