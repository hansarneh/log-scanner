-- Enable UUID extension (skip if exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table (only if doesn't exist)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table (only if doesn't exist)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fair_name TEXT,
    sales_rep TEXT,
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- Order items table (only if doesn't exist)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    ean TEXT NOT NULL,
    name TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    price_kr NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance (only if don't exist)
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);

-- Create storage bucket for exports (only if doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for exports bucket (only if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Private exports bucket') THEN
        CREATE POLICY "Private exports bucket" ON storage.objects
            FOR ALL USING (bucket_id = 'exports');
    END IF;
END $$;
