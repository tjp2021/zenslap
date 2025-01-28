drop trigger if exists "update_crisis_assessment_timestamp" on "public"."tickets";

drop policy "Crisis fields viewable by staff only" on "public"."tickets";

alter table "public"."ai_analyses" drop constraint "valid_crisis_result";

alter table "public"."notifications" drop constraint "notifications_ai_analysis_id_fkey";

alter table "public"."notifications" drop constraint "notifications_confidence_check";

alter table "public"."notifications" drop constraint "notifications_priority_check";

alter table "public"."tickets" drop constraint "tickets_escalated_from_fkey";

drop function if exists "public"."update_crisis_assessment_timestamp"();

drop index if exists "public"."idx_ai_analyses_crisis";

drop index if exists "public"."idx_notifications_ai_analysis";

drop index if exists "public"."idx_notifications_priority";

drop index if exists "public"."idx_tickets_crisis";

drop index if exists "public"."idx_tickets_escalated_from";

alter type "public"."analysis_type" rename to "analysis_type__old_version_to_be_dropped";

create type "public"."analysis_type" as enum ('sentiment', 'priority', 'category', 'response', 'urgency');

alter table "public"."ai_analyses" alter column type type "public"."analysis_type" using type::text::"public"."analysis_type";

drop type "public"."analysis_type__old_version_to_be_dropped";

alter table "public"."notifications" drop column "ai_analysis_id";

alter table "public"."notifications" drop column "ai_metadata";

alter table "public"."notifications" drop column "confidence";

alter table "public"."notifications" drop column "priority";

alter table "public"."tickets" drop column "crisis_type";

alter table "public"."tickets" drop column "cultural_context";

alter table "public"."tickets" drop column "escalated_from";

alter table "public"."tickets" drop column "has_actionable_plan";

alter table "public"."tickets" drop column "is_general_inquiry";

alter table "public"."tickets" drop column "is_metaphorical";

alter table "public"."tickets" drop column "is_passive_ideation";

alter table "public"."tickets" drop column "last_crisis_assessment_at";

alter table "public"."tickets" drop column "location_based";

alter table "public"."tickets" drop column "requires_immediate";

alter table "public"."tickets" drop column "response_protocol";

alter table "public"."tickets" drop column "severity_level";

alter table "public"."tickets" alter column "priority" drop default;

drop type "public"."crisis_type";

drop type "public"."response_protocol";

drop type "public"."severity_level";


