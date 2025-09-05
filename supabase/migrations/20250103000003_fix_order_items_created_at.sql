-- Fix order_items created_at column to ensure it's properly set
-- This migration ensures that created_at is always set and has proper defaults

-- First, update any existing order_items that might have NULL created_at
UPDATE order_items 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Make sure the column has the proper default and is NOT NULL
ALTER TABLE order_items 
ALTER COLUMN created_at SET DEFAULT NOW();

-- Ensure the column is NOT NULL (this will fail if there are still NULL values)
ALTER TABLE order_items 
ALTER COLUMN created_at SET NOT NULL;

-- Add comment explaining the created_at field
COMMENT ON COLUMN order_items.created_at IS 'Timestamp when the order item was created. Always set on insert, preserved on update.';
