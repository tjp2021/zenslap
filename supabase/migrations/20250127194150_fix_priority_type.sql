-- Drop dependent views first
DROP VIEW IF EXISTS "public"."sla_monitoring";
DROP VIEW IF EXISTS "public"."schema_columns";
DROP VIEW IF EXISTS "public"."schema_constraints";
DROP VIEW IF EXISTS "public"."columns";
DROP VIEW IF EXISTS "public"."table_constraints";

-- First, temporarily change the priority column to allow NULL
ALTER TABLE "public"."tickets" ALTER COLUMN "priority" DROP NOT NULL;

-- Then drop the default value
ALTER TABLE "public"."tickets" ALTER COLUMN "priority" DROP DEFAULT;

-- Drop any constraints that might reference the column
ALTER TABLE "public"."tickets" DROP CONSTRAINT IF EXISTS "tickets_priority_check";

-- Now we can safely change the type
ALTER TABLE "public"."tickets" 
  ALTER COLUMN "priority" TYPE text 
  USING priority::text;

-- Set the default and NOT NULL constraint back
ALTER TABLE "public"."tickets" 
  ALTER COLUMN "priority" SET DEFAULT 'medium'::text,
  ALTER COLUMN "priority" SET NOT NULL;

-- Add the check constraint back
ALTER TABLE "public"."tickets" 
  ADD CONSTRAINT "tickets_priority_check" 
  CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));

-- Down migration
ALTER TABLE "public"."tickets" DROP CONSTRAINT IF EXISTS "tickets_priority_check";
ALTER TABLE "public"."tickets" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "public"."tickets" ALTER COLUMN "priority" DROP NOT NULL;
