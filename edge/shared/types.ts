export interface Customer {
  name: string;
  email?: string;
  phone?: string;
}

export interface OrderItem {
  ean: string;
  sku?: string;
  name: string;
  qty: number;
  price_cents: number; // Keep as cents for API compatibility
}

export interface Product {
  id: string;
  ean: string;
  sku?: string;
  name: string;
  price_kr: number; // Use kr in database
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  fair_name?: string;
  sales_rep?: string;
  customer_name: string;
  customer_email?: string;
  note?: string;
}

export interface FinalizeOrderRequest {
  order: Order;
  items: OrderItem[];
  customer?: Customer;
  user_email: string;
  user_fair_name?: string;
}

export interface FinalizeOrderResponse {
  success: boolean;
  order_id: string;
  csv_url?: string;
  message?: string;
  error?: string;
}


