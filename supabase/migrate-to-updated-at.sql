-- Migration: Add updated_at column to products table and remove vat_rate columns
-- Run this if you have an existing products table without updated_at

-- Add updated_at column with default value
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have updated_at = created_at
UPDATE products SET updated_at = created_at WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after setting values
ALTER TABLE products ALTER COLUMN updated_at SET NOT NULL;

-- Remove vat_rate column from products table (if it exists)
ALTER TABLE products DROP COLUMN IF EXISTS vat_rate;

-- Remove vat_rate column from order_items table (if it exists)
-- Note: This will only work if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        ALTER TABLE order_items DROP COLUMN IF EXISTS vat_rate;
    END IF;
END $$;

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
