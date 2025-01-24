-- First remove any existing foreign key constraint if it exists
ALTER TABLE ticket_activities 
DROP CONSTRAINT IF EXISTS ticket_activities_ticket_id_fkey;

-- Add the foreign key constraint
ALTER TABLE ticket_activities
ADD CONSTRAINT ticket_activities_ticket_id_fkey 
FOREIGN KEY (ticket_id) 
REFERENCES tickets(id)
ON DELETE CASCADE; 