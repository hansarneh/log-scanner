-- Fix RLS Policies for Critical Tables
-- This migration ensures proper security on customers, orders, and order_items tables

-- Enable RLS on all critical tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers are viewable by everyone" ON customers;
DROP POLICY IF EXISTS "Customers are insertable by service role" ON customers;
DROP POLICY IF EXISTS "Customers are updatable by service role" ON customers;
DROP POLICY IF EXISTS "Customers are deletable by service role" ON customers;

DROP POLICY IF EXISTS "Orders are viewable by everyone" ON orders;
DROP POLICY IF EXISTS "Orders are insertable by service role" ON orders;
DROP POLICY IF EXISTS "Orders are updatable by service role" ON orders;
DROP POLICY IF EXISTS "Orders are deletable by service role" ON orders;

DROP POLICY IF EXISTS "Order items are viewable by everyone" ON order_items;
DROP POLICY IF EXISTS "Order items are insertable by service role" ON order_items;
DROP POLICY IF EXISTS "Order items are updatable by service role" ON order_items;
DROP POLICY IF EXISTS "Order items are deletable by service role" ON order_items;

-- Customers: Public read access, service role only for modifications
CREATE POLICY "Customers are viewable by everyone" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Customers are insertable by service role" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Customers are updatable by service role" ON customers
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Customers are deletable by service role" ON customers
    FOR DELETE USING (auth.role() = 'service_role');

-- Orders: Public read access, service role only for modifications
CREATE POLICY "Orders are viewable by everyone" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Orders are insertable by service role" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Orders are updatable by service role" ON orders
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Orders are deletable by service role" ON orders
    FOR DELETE USING (auth.role() = 'service_role');

-- Order items: Public read access, service role only for modifications
CREATE POLICY "Order items are viewable by everyone" ON order_items
    FOR SELECT USING (true);

CREATE POLICY "Order items are insertable by service role" ON order_items
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Order items are updatable by service role" ON order_items
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Order items are deletable by service role" ON order_items
    FOR DELETE USING (auth.role() = 'service_role');
