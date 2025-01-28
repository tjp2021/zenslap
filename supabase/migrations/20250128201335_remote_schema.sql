DROP TRIGGER IF EXISTS "update_crisis_assessment_timestamp" ON "public"."tickets";

DROP POLICY IF EXISTS "Crisis fields viewable by staff only" ON "public"."tickets";

ALTER TABLE IF EXISTS "public"."ai_analyses" 
    DROP CONSTRAINT IF EXISTS "valid_crisis_result";

ALTER TABLE IF EXISTS "public"."notifications" 
    DROP CONSTRAINT IF EXISTS "notifications_ai_analysis_id_fkey",
    DROP CONSTRAINT IF EXISTS "notifications_confidence_check",
    DROP CONSTRAINT IF EXISTS "notifications_priority_check";

ALTER TABLE IF EXISTS "public"."tickets" 
    DROP CONSTRAINT IF EXISTS "tickets_escalated_from_fkey";

DROP FUNCTION IF EXISTS "public"."update_crisis_assessment_timestamp"();

DROP INDEX IF EXISTS "public"."idx_ai_analyses_crisis";
DROP INDEX IF EXISTS "public"."idx_notifications_ai_analysis";
DROP INDEX IF EXISTS "public"."idx_notifications_priority";
DROP INDEX IF EXISTS "public"."idx_tickets_crisis";
DROP INDEX IF EXISTS "public"."idx_tickets_escalated_from";

DO $$ BEGIN
    ALTER TYPE "public"."analysis_type" 
    RENAME TO "analysis_type__old_version_to_be_dropped";
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE TYPE "public"."analysis_type" AS ENUM (
    'sentiment', 'priority', 'category', 'response', 'urgency'
);

DO $$ BEGIN
    ALTER TABLE "public"."ai_analyses" 
        ALTER COLUMN type TYPE "public"."analysis_type" 
        USING type::text::"public"."analysis_type";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DROP TYPE IF EXISTS "public"."analysis_type__old_version_to_be_dropped";

DO $$ BEGIN
    ALTER TABLE "public"."notifications" 
        DROP COLUMN "ai_analysis_id",
        DROP COLUMN "ai_metadata",
        DROP COLUMN "confidence",
        DROP COLUMN "priority";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."tickets" 
        DROP COLUMN "crisis_type",
        DROP COLUMN "cultural_context",
        DROP COLUMN "escalated_from",
        DROP COLUMN "has_actionable_plan",
        DROP COLUMN "is_general_inquiry",
        DROP COLUMN "is_metaphorical",
        DROP COLUMN "is_passive_ideation",
        DROP COLUMN "last_crisis_assessment_at",
        DROP COLUMN "location_based",
        DROP COLUMN "requires_immediate",
        DROP COLUMN "response_protocol",
        DROP COLUMN "severity_level";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."tickets" 
        ALTER COLUMN "priority" DROP DEFAULT;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DROP TYPE IF EXISTS "public"."crisis_type";
DROP TYPE IF EXISTS "public"."response_protocol";
DROP TYPE IF EXISTS "public"."severity_level";


