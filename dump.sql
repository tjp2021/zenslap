

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


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "is_internal" boolean DEFAULT false,
    "parent_id" "uuid",
    "content" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_activities_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['comment'::"text", 'note'::"text", 'status_change'::"text", 'field_change'::"text"])))
);


ALTER TABLE "public"."ticket_activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_activities" IS 'Stores all ticket-related activities including comments, notes, and changes';



COMMENT ON COLUMN "public"."ticket_activities"."activity_type" IS 'Type of activity: comment, note, status_change, or field_change';



COMMENT ON COLUMN "public"."ticket_activities"."is_internal" IS 'Whether this activity is internal-only (e.g. internal notes)';



COMMENT ON COLUMN "public"."ticket_activities"."content" IS 'JSONB content specific to activity type';



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
    CONSTRAINT "tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_secure" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users_secure" OWNER TO "postgres";


ALTER TABLE ONLY "public"."internal_notes"
    ADD CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quick_responses"
    ADD CONSTRAINT "quick_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."response_categories"
    ADD CONSTRAINT "response_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."response_categories"
    ADD CONSTRAINT "response_categories_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_ticket_activities_ticket_id_created_at" ON "public"."ticket_activities" USING "btree" ("ticket_id", "created_at" DESC);



CREATE INDEX "idx_tickets_assignee" ON "public"."tickets" USING "btree" ("assignee");



CREATE INDEX "internal_notes_created_at_idx" ON "public"."internal_notes" USING "btree" ("created_at");



CREATE INDEX "internal_notes_ticket_id_idx" ON "public"."internal_notes" USING "btree" ("ticket_id");



CREATE INDEX "quick_responses_category_id_idx" ON "public"."quick_responses" USING "btree" ("category_id");



CREATE INDEX "quick_responses_created_by_idx" ON "public"."quick_responses" USING "btree" ("created_by");



CREATE INDEX "ticket_activities_ticket_id_created_at_idx" ON "public"."ticket_activities" USING "btree" ("ticket_id", "created_at" DESC);



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



CREATE OR REPLACE TRIGGER "ticket_history_trigger" AFTER UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."record_ticket_change"();



CREATE OR REPLACE TRIGGER "update_internal_notes_updated_at" BEFORE UPDATE ON "public"."internal_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quick_responses_updated_at" BEFORE UPDATE ON "public"."quick_responses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_responses"
    ADD CONSTRAINT "quick_responses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."response_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_activities"
    ADD CONSTRAINT "ticket_activities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."ticket_activities"("id");



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



CREATE POLICY "Authenticated users can create activities" ON "public"."ticket_activities" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "actor_id"));



CREATE POLICY "Authenticated users can create tickets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update tickets" ON "public"."tickets" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all activities" ON "public"."ticket_activities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all tickets" ON "public"."tickets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Tags are viewable by authenticated users" ON "public"."tags" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Ticket messages are insertable by authenticated users" ON "public"."ticket_messages" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Ticket messages are viewable by authenticated users" ON "public"."ticket_messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Ticket tags are viewable by authenticated users" ON "public"."ticket_tags" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view all users when authenticated" ON "public"."users_secure" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view tickets assigned to them" ON "public"."tickets" FOR SELECT TO "authenticated" USING ((("assignee" = "auth"."uid"()) OR ("assignee" IS NULL)));



CREATE POLICY "create_internal_notes" ON "public"."internal_notes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "internal_notes"."ticket_id") AND (("t"."assignee" = "auth"."uid"()) OR ("t"."assignee" IS NULL))))));



CREATE POLICY "delete_ticket_activities" ON "public"."ticket_activities" FOR DELETE TO "authenticated" USING (("actor_id" = "auth"."uid"()));



CREATE POLICY "delete_tickets" ON "public"."tickets" FOR DELETE TO "authenticated" USING ((("assignee" = "auth"."uid"()) OR ("assignee" IS NULL)));



CREATE POLICY "insert_internal_notes" ON "public"."internal_notes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "insert_ticket_activities" ON "public"."ticket_activities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_activities"."ticket_id") AND (("t"."assignee" = "auth"."uid"()) OR ("t"."assignee" IS NULL))))));



CREATE POLICY "insert_tickets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."internal_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quick_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_tickets" ON "public"."tickets" FOR UPDATE TO "authenticated" USING ((("assignee" = "auth"."uid"()) OR ("assignee" IS NULL)));



CREATE POLICY "update_users_secure" ON "public"."users_secure" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."users_secure" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view_internal_notes" ON "public"."internal_notes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "internal_notes"."ticket_id") AND (("t"."assignee" = "auth"."uid"()) OR ("t"."assignee" IS NULL))))));



CREATE POLICY "view_ticket_activities" ON "public"."ticket_activities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_activities"."ticket_id") AND (("t"."assignee" = "auth"."uid"()) OR ("t"."assignee" IS NULL))))));



CREATE PUBLICATION "realtime_messages_publication_v2_34_1" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "realtime_messages_publication_v2_34_1" OWNER TO "supabase_admin";




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_ticket_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_ticket_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_ticket_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sanitize_user_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."sanitize_user_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sanitize_user_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_users_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_users_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_users_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_with_activity"("p_ticket_id" "uuid", "p_updates" "jsonb", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."internal_notes" TO "anon";
GRANT ALL ON TABLE "public"."internal_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."internal_notes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quick_responses" TO "anon";
GRANT ALL ON TABLE "public"."quick_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_responses" TO "service_role";



GRANT ALL ON TABLE "public"."response_categories" TO "anon";
GRANT ALL ON TABLE "public"."response_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."response_categories" TO "service_role";



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



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



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
