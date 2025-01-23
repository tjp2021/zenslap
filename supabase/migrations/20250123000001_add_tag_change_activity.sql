-- Temporarily disable the constraint
ALTER TABLE ticket_activities 
DROP CONSTRAINT IF EXISTS ticket_activities_activity_type_check;

-- Add new check constraint with tag_change
ALTER TABLE ticket_activities
ADD CONSTRAINT ticket_activities_activity_type_check
CHECK (activity_type IN ('comment', 'status_change', 'field_change', 'assignment', 'tag_change')); 