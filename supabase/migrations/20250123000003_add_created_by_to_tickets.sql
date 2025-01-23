-- Add created_by column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Set created_by to current user for existing tickets
UPDATE tickets 
SET created_by = auth.uid()
WHERE created_by IS NULL; 