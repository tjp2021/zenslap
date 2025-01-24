-- Drop the existing foreign key constraint
ALTER TABLE ticket_activities
DROP CONSTRAINT IF EXISTS ticket_activities_actor_id_fkey;

-- Add new foreign key constraint referencing users_secure
ALTER TABLE ticket_activities
ADD CONSTRAINT ticket_activities_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES users_secure(id) ON DELETE CASCADE;
