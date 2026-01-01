-- Add quantity field to catches table for bulk catch logging
-- Run this in Supabase Dashboard > SQL Editor

-- Add quantity column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'catches' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE catches ADD COLUMN quantity integer DEFAULT 1 NOT NULL;
    
    -- Add constraint to ensure quantity is positive
    ALTER TABLE catches ADD CONSTRAINT catches_quantity_positive CHECK (quantity > 0);
    
    -- Add comment for documentation
    COMMENT ON COLUMN catches.quantity IS 'Number of fish caught (for bulk catches like mackerel or schoolie bass). Defaults to 1 for individual catches.';
    
    -- Add index for queries that might filter by quantity
    CREATE INDEX idx_catches_quantity ON catches(quantity) WHERE quantity > 1;
    
    RAISE NOTICE 'Successfully added quantity field to catches table';
  ELSE
    RAISE NOTICE 'Quantity field already exists on catches table';
  END IF;
END $$;
