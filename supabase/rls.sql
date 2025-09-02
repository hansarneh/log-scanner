-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products: Public read access
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (true);

-- Products: Only service role can modify
CREATE POLICY "Products are insertable by service role" ON products
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Products are updatable by service role" ON products
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Products are deletable by service role" ON products
    FOR DELETE USING (auth.role() = 'service_role');

-- Customers: Public read access
CREATE POLICY "Customers are viewable by everyone" ON customers
    FOR SELECT USING (true);

-- Customers: Only service role can modify
CREATE POLICY "Customers are insertable by service role" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Customers are updatable by service role" ON customers
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Customers are deletable by service role" ON customers
    FOR DELETE USING (auth.role() = 'service_role');

-- Orders: Public read access
CREATE POLICY "Orders are viewable by everyone" ON orders
    FOR SELECT USING (true);

-- Orders: Only service role can modify
CREATE POLICY "Orders are insertable by service role" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Orders are updatable by service role" ON orders
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Orders are deletable by service role" ON orders
    FOR DELETE USING (auth.role() = 'service_role');

-- Order items: Public read access
CREATE POLICY "Order items are viewable by everyone" ON order_items
    FOR SELECT USING (true);

-- Order items: Only service role can modify
CREATE POLICY "Order items are insertable by service role" ON order_items
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Order items are updatable by service role" ON order_items
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Order items are deletable by service role" ON order_items
    FOR DELETE USING (auth.role() = 'service_role');
