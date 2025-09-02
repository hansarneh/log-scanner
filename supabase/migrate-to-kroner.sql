-- Migration script: Convert price_cents to price_kr
-- Run this script on your existing Supabase database

-- Step 1: Check which tables exist and add new price_kr columns
DO $$
BEGIN
    -- Add price_kr to products table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price_kr') THEN
            ALTER TABLE products ADD COLUMN price_kr NUMERIC(10,2);
        END IF;
    END IF;
    
    -- Add price_kr to order_items table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_kr') THEN
            ALTER TABLE order_items ADD COLUMN price_kr NUMERIC(10,2);
        END IF;
    END IF;
END $$;

-- Step 2: Convert existing data from øre to kroner (only if price_cents exists)
DO $$
BEGIN
    -- Convert products table if price_cents exists
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price_cents') THEN
        UPDATE products 
        SET price_kr = ROUND(price_cents::NUMERIC / 100, 2)
        WHERE price_cents IS NOT NULL;
        
        RAISE NOTICE 'Converted products.price_cents to products.price_kr';
    ELSE
        RAISE NOTICE 'products.price_cents column does not exist, skipping conversion';
    END IF;
    
    -- Convert order_items table if it exists and has price_cents
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') 
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_cents') THEN
        UPDATE order_items 
        SET price_kr = ROUND(price_cents::NUMERIC / 100, 2)
        WHERE price_cents IS NOT NULL;
        
        RAISE NOTICE 'Converted order_items.price_cents to order_items.price_kr';
    ELSE
        RAISE NOTICE 'order_items table or price_cents column does not exist, skipping conversion';
    END IF;
END $$;

-- Step 3: Set default values for any NULL prices
UPDATE products SET price_kr = 0.00 WHERE price_kr IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        UPDATE order_items SET price_kr = 0.00 WHERE price_kr IS NULL;
    END IF;
END $$;

-- Step 4: Make price_kr NOT NULL
ALTER TABLE products ALTER COLUMN price_kr SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        ALTER TABLE order_items ALTER COLUMN price_kr SET NOT NULL;
    END IF;
END $$;

-- Step 5: Drop old price_cents columns (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price_cents') THEN
        ALTER TABLE products DROP COLUMN price_cents;
        RAISE NOTICE 'Dropped products.price_cents column';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') 
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_cents') THEN
        ALTER TABLE order_items DROP COLUMN price_cents;
        RAISE NOTICE 'Dropped order_items.price_cents column';
    END IF;
END $$;

-- Step 6: Update default value
ALTER TABLE products ALTER COLUMN price_kr SET DEFAULT 0.00;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        ALTER TABLE order_items ALTER COLUMN price_kr SET DEFAULT 0.00;
    END IF;
END $$;

-- Verify the migration
SELECT 
    'products' as table_name,
    COUNT(*) as total_rows,
    MIN(price_kr) as min_price,
    MAX(price_kr) as max_price,
    AVG(price_kr) as avg_price
FROM products;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE 'order_items table exists, you can query it separately';
    ELSE
        RAISE NOTICE 'order_items table does not exist yet - it will be created when you run the full schema';
    END IF;
END $$;
