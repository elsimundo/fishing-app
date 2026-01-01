-- Add quantity field to catches table for bulk catch logging
-- Allows logging multiple fish of the same species in one entry (e.g., "12x Mackerel")

ALTER TABLE catches ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1 NOT NULL;

-- Add constraint to ensure quantity is positive
ALTER TABLE catches ADD CONSTRAINT catches_quantity_positive CHECK (quantity > 0);

-- Add comment for documentation
COMMENT ON COLUMN catches.quantity IS 'Number of fish caught (for bulk catches like mackerel or schoolie bass). Defaults to 1 for individual catches.';

-- Add index for queries that might filter by quantity
CREATE INDEX IF NOT EXISTS idx_catches_quantity ON catches(quantity) WHERE quantity > 1;
