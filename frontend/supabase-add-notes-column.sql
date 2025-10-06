-- Add notes column to transactions table
-- Execute this in Supabase SQL Editor

-- Add notes column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN notes TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.transactions.notes IS 'Optional notes for the transaction';

-- Update existing transactions to have NULL notes (they will be empty by default)
-- No need to update existing data as NULL is the default

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
