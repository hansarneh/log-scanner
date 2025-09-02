-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ean TEXT UNIQUE NOT NULL,
    sku TEXT,
    name TEXT NOT NULL,
    price_kr NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
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

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    ean TEXT NOT NULL,
    name TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    price_kr NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX products_ean_idx ON products(ean);
CREATE INDEX order_items_order_idx ON order_items(order_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX customers_email_idx ON customers(email);

-- Create storage bucket for exports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for exports bucket
CREATE POLICY "Private exports bucket" ON storage.objects
    FOR ALL USING (bucket_id = 'exports');

-- Create a trigger to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
