-- Add discount functionality to order_items table
-- This migration adds discount_percent and discount_reason columns

-- Add discount columns to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- Update existing order_items to have 0% discount
UPDATE order_items 
SET discount_percent = 0.00 
WHERE discount_percent IS NULL;

-- Make discount_percent NOT NULL
ALTER TABLE order_items 
ALTER COLUMN discount_percent SET NOT NULL;

-- Add comment explaining the discount system
COMMENT ON COLUMN order_items.discount_percent IS 'Discount percentage (0.00 to 100.00)';
COMMENT ON COLUMN order_items.discount_reason IS 'Reason for discount (e.g., "Bulk order", "Loyalty discount")';

-- Create index for discount queries
CREATE INDEX IF NOT EXISTS order_items_discount_idx ON order_items(discount_percent);

-- Update the update_updated_at_column function to work with order_items
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to order_items table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_order_items_updated_at'
    ) THEN
        CREATE TRIGGER update_order_items_updated_at
            BEFORE UPDATE ON order_items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
