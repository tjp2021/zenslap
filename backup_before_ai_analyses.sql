

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."sla_priority" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."sla_priority" OWNER TO "postgres";


CREATE TYPE "public"."sla_status" AS ENUM (
    'pending',
    'breached',
    'met'
);


ALTER TYPE "public"."sla_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_sla_deadlines"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get the active SLA policy for the ticket's priority
    SELECT * INTO policy_record
    FROM public.sla_policies
    WHERE priority = NEW.priority AND is_active = true;

    IF FOUND THEN
        -- Calculate response deadline
        NEW.sla_response_deadline := NEW.created_at + (policy_record.response_time_hours || ' hours')::interval;
        -- Calculate resolution deadline
        NEW.sla_resolution_deadline := NEW.created_at + (policy_record.resolution_time_hours || ' hours')::interval;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_sla_deadlines"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_mention_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Debug logging
    INSERT INTO debug_log (message) 
    VALUES (
        'TRIGGER FIRED - Activity: ' || NEW.id || 
        ' Mentions: ' || NEW.mentioned_user_ids::text
    );
    
    -- Create notifications for any staff members who are mentioned
    IF NEW.mentioned_user_ids IS NOT NULL AND array_length(NEW.mentioned_user_ids, 1) > 0 THEN
        INSERT INTO notifications (user_id, activity_id)
        SELECT us.id, NEW.id
        FROM unnest(NEW.mentioned_user_ids) AS mentioned_id
        JOIN users_secure us ON us.id = mentioned_id
        WHERE LOWER(us.role) IN ('admin', 'agent');
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_mention_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, new.raw_user_meta_data->>'role');
    return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notifications_as_read"("user_id" "uuid", "notification_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    update_count integer;
BEGIN
    -- Log which notifications we're updating
    RAISE LOG 'Marking notifications as read for user %, notifications: %', user_id, notification_ids;
    
    -- Update notifications
    WITH updated AS (
        UPDATE notifications 
        SET read = true
        WHERE user_id = $1
        AND id = ANY($2)
        RETURNING id
    )
    SELECT COUNT(*) INTO update_count FROM updated;
    
    -- Log how many were updated
    RAISE LOG 'Updated % notifications', update_count;
END;
$_$;


ALTER FUNCTION "public"."mark_notifications_as_read"("user_id" "uuid", "notification_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_ticket_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if TG_OP = 'UPDATE' then
        -- Record changes for each field
        if OLD.title != NEW.title then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'title', OLD.title, NEW.title);
        end if;

        if OLD.description != NEW.description then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'description', OLD.description, NEW.description);
        end if;

        if OLD.status != NEW.status then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'status', OLD.status, NEW.status);
        end if;

        if OLD.priority != NEW.priority then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'priority', OLD.priority, NEW.priority);
        end if;
    end if;
    return NEW;
end;
$$;


ALTER FUNCTION "public"."record_ticket_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sanitize_user_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Ensure raw_app_meta_data is not null and is a valid jsonb
  IF NEW.raw_app_meta_data IS NULL THEN
    NEW.raw_app_meta_data := '{}'::jsonb;
  END IF;

  -- Ensure role exists and is valid
  IF NOT (NEW.raw_app_meta_data ? 'role') THEN
    -- Default to 'user' role if not specified
    NEW.raw_app_meta_data := NEW.raw_app_meta_data || '{"role": "user"}'::jsonb;
  END IF;

  -- Validate role is one of: 'admin', 'agent', 'user'
  IF NOT (NEW.raw_app_meta_data->>'role' = ANY(ARRAY['admin', 'agent', 'user'])) THEN
    NEW.raw_app_meta_data := NEW.raw_app_meta_data || '{"role": "user"}'::jsonb;
  END IF;

  -- Preserve provider information if it exists
  IF NEW.raw_app_meta_data ? 'provider' THEN
    NEW.raw_app_meta_data := jsonb_build_object(
      'role', NEW.raw_app_meta_data->>'role',
      'provider', NEW.raw_app_meta_data->>'provider',
      'providers', NEW.raw_app_meta_data->'providers'
    );
  ELSE
    NEW.raw_app_meta_data := jsonb_build_object(
      'role', NEW.raw_app_meta_data->>'role'
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sanitize_user_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_users_secure"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.users_secure (id, email, role, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_app_meta_data->>'role', 'user'),
            NEW.created_at,
            now()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            updated_at = now();
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.users_secure WHERE id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_users_secure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sla_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update first response timestamp if it's a comment and not set yet
    IF NEW.activity_type = 'comment' AND OLD.first_response_at IS NULL THEN
        NEW.first_response_at = now();
        -- Update SLA response status
        IF NEW.first_response_at <= NEW.sla_response_deadline THEN
            NEW.sla_response_status = 'met';
        ELSE
            NEW.sla_response_status = 'breached';
        END IF;
    END IF;

    -- Update resolution timestamp if status changed to 'resolved'
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolution_at = now();
        -- Update SLA resolution status
        IF NEW.resolution_at <= NEW.sla_resolution_deadline THEN
            NEW.sla_resolution_status = 'met';
        ELSE
            NEW.sla_resolution_status = 'breached';
        END IF;
    -- Reset resolution timestamp if status changed from 'resolved' to something else
    ELSIF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
        NEW.resolution_at = NULL;
        NEW.sla_resolution_status = 'pending';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sla_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_old_ticket JSONB;
    v_new_ticket JSONB;
    v_field TEXT;
    v_old_value TEXT;
    v_new_value TEXT;
BEGIN
    -- Get the old ticket state
    SELECT to_jsonb(t) INTO v_old_ticket
    FROM tickets t
    WHERE id = p_ticket_id;

    IF v_old_ticket IS NULL THEN
        RAISE EXCEPTION 'Ticket not found';
    END IF;

    -- Update the ticket
    UPDATE tickets
    SET
        title = COALESCE((p_updates->>'title'), title),
        description = COALESCE((p_updates->>'description'), description),
        status = COALESCE((p_updates->>'status'), status),
        priority = COALESCE((p_updates->>'priority'), priority),
        metadata = COALESCE((p_updates->>'metadata')::jsonb, metadata),
        assignee = COALESCE((p_updates->>'assignee')::uuid, assignee),
        updated_at = NOW()
    WHERE id = p_ticket_id
    RETURNING to_jsonb(tickets.*) INTO v_new_ticket;

    -- Record activities for each changed field
    FOR v_field, v_new_value IN 
        SELECT key, value::text 
        FROM jsonb_each_text(p_updates)
    LOOP
        v_old_value := v_old_ticket->>v_field;
        
        IF v_old_value IS DISTINCT FROM v_new_value THEN
            -- Special handling for assignment changes
            IF v_field = 'assignee' THEN
                INSERT INTO ticket_activities (
                    ticket_id,
                    actor_id,
                    activity_type,
                    content
                ) VALUES (
                    p_ticket_id,
                    p_actor_id,
                    'assignment',
                    jsonb_build_object(
                        'from', v_old_value,
                        'to', v_new_value
                    )
                );
            -- Handle status changes
            ELSIF v_field = 'status' THEN
                INSERT INTO ticket_activities (
                    ticket_id,
                    actor_id,
                    activity_type,
                    content
                ) VALUES (
                    p_ticket_id,
                    p_actor_id,
                    'status_change',
                    jsonb_build_object(
                        'from', v_old_value,
                        'to', v_new_value
                    )
                );
            -- Handle other field changes
            ELSE
                INSERT INTO ticket_activities (
                    ticket_id,
                    actor_id,
                    activity_type,
                    content
                ) VALUES (
                    p_ticket_id,
                    p_actor_id,
                    'field_change',
                    jsonb_build_object(
                        'field', v_field,
                        'from', v_old_value,
                        'to', v_new_value
                    )
                );
            END IF;
        END IF;
    END LOOP;

    RETURN v_new_ticket;
END;
$$;


ALTER FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."debug_log" (
    "id" integer NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."debug_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."debug_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."debug_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."debug_log_id_seq" OWNED BY "public"."debug_log"."id";



CREATE TABLE IF NOT EXISTS "public"."internal_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mentions" "text"[]
);


ALTER TABLE "public"."internal_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quick_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."quick_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."response_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."response_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assignee" "uuid",
    "sla_response_deadline" timestamp with time zone,
    "sla_resolution_deadline" timestamp with time zone,
    "first_response_at" timestamp with time zone,
    "resolution_at" timestamp with time zone,
    "sla_response_status" "public"."sla_status" DEFAULT 'pending'::"public"."sla_status",
    "sla_resolution_status" "public"."sla_status" DEFAULT 'pending'::"public"."sla_status",
    CONSTRAINT "tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sla_monitoring" AS
 SELECT "t"."id",
    "t"."title",
    "t"."status",
    "t"."priority",
    "t"."created_at",
    "t"."sla_response_deadline",
    "t"."sla_resolution_deadline",
    "t"."first_response_at",
    "t"."resolution_at",
    "t"."sla_response_status",
    "t"."sla_resolution_status",
        CASE
            WHEN (("t"."first_response_at" IS NULL) AND ("now"() > "t"."sla_response_deadline")) THEN true
            WHEN (("t"."resolution_at" IS NULL) AND ("now"() > "t"."sla_resolution_deadline")) THEN true
            ELSE false
        END AS "is_breaching_sla"
   FROM "public"."tickets" "t";


ALTER TABLE "public"."sla_monitoring" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sla_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "priority" "public"."sla_priority" NOT NULL,
    "response_time_hours" integer NOT NULL,
    "resolution_time_hours" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sla_policies_resolution_time_hours_check" CHECK (("resolution_time_hours" > 0)),
    CONSTRAINT "sla_policies_response_time_hours_check" CHECK (("response_time_hours" > 0))
);


ALTER TABLE "public"."sla_policies" OWNER TO "postgres";


COMMENT ON TABLE "public"."sla_policies" IS 'Stores SLA policy configurations for different ticket priorities';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "mentioned_user_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_activities_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['comment'::"text", 'status_change'::"text", 'field_change'::"text", 'assignment'::"text"])))
);


ALTER TABLE "public"."ticket_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "field" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text"
);


ALTER TABLE "public"."ticket_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_messages_type_check" CHECK (("type" = ANY (ARRAY['customer'::"text", 'agent'::"text"])))
);


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_tags" (
    "ticket_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_secure" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users_secure" OWNER TO "postgres";


ALTER TABLE ONLY "public"."debug_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."debug_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."debug_log"
    ADD CONSTRAINT "debug_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."internal_notes"
    ADD CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quick_responses"
    ADD CONSTRAINT "quick_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."response_categories"
    ADD CONSTRAINT "response_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."response_categories"
    ADD CONSTRAINT "response_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sla_policies"
    ADD CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_activities"
    ADD CONSTRAINT "ticket_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticket_id", "tag_id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_secure"
    ADD CONSTRAINT "users_secure_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_internal_notes_created_by" ON "public"."internal_notes" USING "btree" ("created_by");



CREATE INDEX "idx_internal_notes_mentions" ON "public"."internal_notes" USING "gin" ("mentions");



CREATE INDEX "idx_internal_notes_ticket_id" ON "public"."internal_notes" USING "btree" ("ticket_id");



CREATE INDEX "idx_notif_activity" ON "public"."notifications" USING "btree" ("activity_id");



CREATE INDEX "idx_notif_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_activity_id" ON "public"."notifications" USING "btree" ("activity_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_ta_actor" ON "public"."ticket_activities" USING "btree" ("actor_id");



CREATE INDEX "idx_ta_ticket_created" ON "public"."ticket_activities" USING "btree" ("ticket_id", "created_at" DESC);



CREATE INDEX "idx_ticket_activities_actor_id" ON "public"."ticket_activities" USING "btree" ("actor_id");



CREATE INDEX "idx_ticket_activities_ticket_id" ON "public"."ticket_activities" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_assignee" ON "public"."tickets" USING "btree" ("assignee");



CREATE INDEX "internal_notes_created_at_idx" ON "public"."internal_notes" USING "btree" ("created_at");



CREATE INDEX "internal_notes_ticket_id_idx" ON "public"."internal_notes" USING "btree" ("ticket_id");



CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "quick_responses_category_id_idx" ON "public"."quick_responses" USING "btree" ("category_id");



CREATE INDEX "quick_responses_created_by_idx" ON "public"."quick_responses" USING "btree" ("created_by");



CREATE INDEX "ticket_history_created_at_idx" ON "public"."ticket_history" USING "btree" ("created_at");



CREATE INDEX "ticket_history_ticket_id_idx" ON "public"."ticket_history" USING "btree" ("ticket_id");



CREATE INDEX "ticket_messages_created_at_idx" ON "public"."ticket_messages" USING "btree" ("created_at");



CREATE INDEX "ticket_messages_ticket_id_idx" ON "public"."ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "ticket_tags_tag_id_idx" ON "public"."ticket_tags" USING "btree" ("tag_id");



CREATE INDEX "ticket_tags_ticket_id_idx" ON "public"."ticket_tags" USING "btree" ("ticket_id");



CREATE INDEX "tickets_created_at_idx" ON "public"."tickets" USING "btree" ("created_at");



CREATE INDEX "tickets_created_by_idx" ON "public"."tickets" USING "btree" ("created_by");



CREATE INDEX "tickets_priority_idx" ON "public"."tickets" USING "btree" ("priority");



CREATE INDEX "tickets_status_idx" ON "public"."tickets" USING "btree" ("status");



CREATE UNIQUE INDEX "unique_active_priority" ON "public"."sla_policies" USING "btree" ("priority") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "on_mention" AFTER INSERT OR UPDATE OF "mentioned_user_ids" ON "public"."ticket_activities" FOR EACH ROW WHEN (("new"."activity_type" = 'comment'::"text")) EXECUTE FUNCTION "public"."create_mention_notifications"();



CREATE OR REPLACE TRIGGER "set_ticket_sla_deadlines" BEFORE INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_sla_deadlines"();



CREATE OR REPLACE TRIGGER "ticket_history_trigger" AFTER UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."record_ticket_change"();



CREATE OR REPLACE TRIGGER "update_internal_notes_updated_at" BEFORE UPDATE ON "public"."internal_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quick_responses_updated_at" BEFORE UPDATE ON "public"."quick_responses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sla_policies_updated_at" BEFORE UPDATE ON "public"."sla_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_ticket_sla_status" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_sla_status"();



ALTER TABLE ONLY "public"."response_categories"
    ADD CONSTRAINT "fk_created_by" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quick_responses"
    ADD CONSTRAINT "fk_created_by" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."internal_notes"
    ADD CONSTRAINT "fk_ticket" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "fk_ticket" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."internal_notes"
    ADD CONSTRAINT "internal_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notif_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."ticket_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notif_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users_secure"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."ticket_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_responses"
    ADD CONSTRAINT "quick_responses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."response_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_activities"
    ADD CONSTRAINT "ta_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users_secure"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_activities"
    ADD CONSTRAINT "ticket_activities_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."users_secure"
    ADD CONSTRAINT "users_secure_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create tickets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update tickets" ON "public"."tickets" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all tickets" ON "public"."tickets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Tags are viewable by authenticated users" ON "public"."tags" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Ticket messages are insertable by authenticated users" ON "public"."ticket_messages" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Ticket messages are viewable by authenticated users" ON "public"."ticket_messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Ticket tags are viewable by authenticated users" ON "public"."ticket_tags" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view tickets assigned to them" ON "public"."tickets" FOR SELECT TO "authenticated" USING ((("assignee" = "auth"."uid"()) OR ("assignee" IS NULL)));



CREATE POLICY "admin_all" ON "public"."sla_policies" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users_secure" "us"
  WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users_secure" "us"
  WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'admin'::"text")))));



CREATE POLICY "create_internal_notes" ON "public"."internal_notes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "internal_notes"."ticket_id") AND (("t"."assignee" = "auth"."uid"()) OR ("t"."assignee" IS NULL))))));



CREATE POLICY "delete_ticket_activities" ON "public"."ticket_activities" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users_secure" "us"
  WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."users_secure" "us"
  WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'agent'::"text") AND ("ticket_activities"."actor_id" = "auth"."uid"()) AND ("ticket_activities"."activity_type" = 'comment'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."users_secure" "us"
  WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'user'::"text") AND ("ticket_activities"."actor_id" = "auth"."uid"()) AND ("ticket_activities"."activity_type" = 'comment'::"text") AND ((("ticket_activities"."content" ->> 'is_internal'::"text"))::boolean IS NOT TRUE))))));



CREATE POLICY "delete_tickets" ON "public"."tickets" FOR DELETE TO "authenticated" USING ((("assignee" = "auth"."uid"()) OR ("assignee" IS NULL)));



CREATE POLICY "insert_internal_notes" ON "public"."internal_notes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "insert_ticket_activities" ON "public"."ticket_activities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_activities"."ticket_id") AND ((EXISTS ( SELECT 1
           FROM "public"."users_secure" "us"
          WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
           FROM "public"."users_secure" "us"
          WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'agent'::"text")))) OR (EXISTS ( SELECT 1
           FROM "public"."users_secure" "us"
          WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'user'::"text") AND ("t"."created_by" = "auth"."uid"()) AND ("ticket_activities"."activity_type" = 'comment'::"text") AND ((("ticket_activities"."content" ->> 'is_internal'::"text"))::boolean IS NOT TRUE)))))))));



CREATE POLICY "insert_tickets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."internal_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notif_select_policy" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "notifications_update_policy" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quick_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sla_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_view_all" ON "public"."users_secure" FOR SELECT TO "authenticated" USING (("auth"."check_user_role"() OR ("auth"."uid"() = "id")));



CREATE POLICY "ta_select_policy" ON "public"."ticket_activities" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."users_secure" "us"
  WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_activities"."ticket_id") AND (("t"."created_by" = "auth"."uid"()) OR ("t"."assignee" = "auth"."uid"())))))));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_delete_policy" ON "public"."tickets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users_secure"
  WHERE (("users_secure"."id" = "auth"."uid"()) AND ("users_secure"."role" = 'admin'::"text")))));



CREATE POLICY "tickets_insert_policy" ON "public"."tickets" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "tickets_select_policy" ON "public"."tickets" FOR SELECT USING ((("auth"."uid"() = "created_by") OR (EXISTS ( SELECT 1
   FROM "public"."users_secure"
  WHERE (("users_secure"."id" = "auth"."uid"()) AND ("users_secure"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"])))))));



CREATE POLICY "tickets_update_policy" ON "public"."tickets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users_secure"
  WHERE (("users_secure"."id" = "auth"."uid"()) AND ("users_secure"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))));



CREATE POLICY "update_tickets" ON "public"."tickets" FOR UPDATE TO "authenticated" USING ((("assignee" = "auth"."uid"()) OR ("assignee" IS NULL)));



CREATE POLICY "update_users_secure" ON "public"."users_secure" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."users_secure" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_secure_access" ON "public"."users_secure" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("role" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))));



CREATE POLICY "view_active" ON "public"."sla_policies" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "view_internal_notes" ON "public"."internal_notes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "internal_notes"."ticket_id") AND (("t"."assignee" = "auth"."uid"()) OR ("t"."assignee" IS NULL))))));



CREATE POLICY "view_ticket_activities" ON "public"."ticket_activities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_activities"."ticket_id") AND ((EXISTS ( SELECT 1
           FROM "public"."users_secure" "us"
          WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
           FROM "public"."users_secure" "us"
          WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'agent'::"text")))) OR (EXISTS ( SELECT 1
           FROM "public"."users_secure" "us"
          WHERE (("us"."id" = "auth"."uid"()) AND ("us"."role" = 'user'::"text") AND ("t"."created_by" = "auth"."uid"()) AND (("ticket_activities"."activity_type" = 'status_change'::"text") OR (("ticket_activities"."activity_type" = 'comment'::"text") AND ((("ticket_activities"."content" ->> 'is_internal'::"text"))::boolean IS NOT TRUE)))))))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


CREATE PUBLICATION "supabase_realtime_messages_publication" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "supabase_realtime_messages_publication" OWNER TO "supabase_admin";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."calculate_sla_deadlines"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sla_deadlines"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sla_deadlines"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_mention_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_mention_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_mention_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("user_id" "uuid", "notification_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("user_id" "uuid", "notification_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_as_read"("user_id" "uuid", "notification_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_ticket_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_ticket_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_ticket_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sanitize_user_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."sanitize_user_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sanitize_user_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_users_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_users_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_users_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sla_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sla_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sla_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."debug_log" TO "anon";
GRANT ALL ON TABLE "public"."debug_log" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."debug_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."debug_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."debug_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."internal_notes" TO "anon";
GRANT ALL ON TABLE "public"."internal_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."internal_notes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quick_responses" TO "anon";
GRANT ALL ON TABLE "public"."quick_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_responses" TO "service_role";



GRANT ALL ON TABLE "public"."response_categories" TO "anon";
GRANT ALL ON TABLE "public"."response_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."response_categories" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."sla_monitoring" TO "anon";
GRANT ALL ON TABLE "public"."sla_monitoring" TO "authenticated";
GRANT ALL ON TABLE "public"."sla_monitoring" TO "service_role";



GRANT ALL ON TABLE "public"."sla_policies" TO "anon";
GRANT ALL ON TABLE "public"."sla_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."sla_policies" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_activities" TO "anon";
GRANT ALL ON TABLE "public"."ticket_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_activities" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_history" TO "anon";
GRANT ALL ON TABLE "public"."ticket_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_history" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_tags" TO "anon";
GRANT ALL ON TABLE "public"."ticket_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_tags" TO "service_role";



GRANT ALL ON TABLE "public"."users_secure" TO "anon";
GRANT ALL ON TABLE "public"."users_secure" TO "authenticated";
GRANT ALL ON TABLE "public"."users_secure" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
