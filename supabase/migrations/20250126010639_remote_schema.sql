create sequence "public"."debug_log_id_seq";

drop trigger if exists "set_updated_at" on "public"."notifications";

drop policy "staff_create_internal_notes" on "public"."internal_notes";

drop policy "staff_view_internal_notes" on "public"."internal_notes";

drop policy "System can create notifications" on "public"."notifications";

drop policy "Users can update own notifications" on "public"."notifications";

drop policy "Users can view own notifications" on "public"."notifications";

alter table "public"."internal_notes" drop constraint "internal_notes_created_by_fkey";

alter table "public"."notifications" drop constraint "notifications_user_id_fkey";

alter table "public"."profiles" drop constraint "profiles_role_check";

alter table "public"."ticket_activities" drop constraint "ta_ticket_id_fkey";

alter table "public"."tickets" drop constraint "tickets_created_by_fkey";

drop function if exists "public"."mark_notifications_as_read"(p_user_id uuid, notification_ids uuid[]);

drop index if exists "public"."idx_notifications_activity";

drop index if exists "public"."idx_notifications_read";

drop index if exists "public"."idx_ticket_activities_ticket_id_created_at";

create table "public"."debug_log" (
    "id" integer not null default nextval('debug_log_id_seq'::regclass),
    "message" text,
    "created_at" timestamp with time zone default now()
);


create table "public"."quick_responses" (
    "id" uuid not null default uuid_generate_v4(),
    "category_id" uuid not null,
    "title" text not null,
    "content" text not null,
    "variables" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null
);


alter table "public"."quick_responses" enable row level security;

create table "public"."response_categories" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null
);


alter table "public"."response_categories" enable row level security;

create table "public"."tags" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "color" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."tags" enable row level security;

create table "public"."ticket_history" (
    "id" uuid not null default uuid_generate_v4(),
    "ticket_id" uuid not null,
    "field" text not null,
    "old_value" text,
    "new_value" text,
    "created_at" timestamp with time zone not null default now(),
    "created_by" text
);


create table "public"."ticket_messages" (
    "id" uuid not null default uuid_generate_v4(),
    "ticket_id" uuid not null,
    "content" text not null,
    "type" text not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."ticket_messages" enable row level security;

create table "public"."ticket_tags" (
    "ticket_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."ticket_tags" enable row level security;

alter table "public"."internal_notes" alter column "created_at" set not null;

alter table "public"."internal_notes" alter column "id" set default uuid_generate_v4();

alter table "public"."internal_notes" alter column "updated_at" set not null;

alter table "public"."profiles" drop column "created_at";

alter table "public"."profiles" drop column "updated_at";

alter table "public"."ticket_activities" alter column "actor_id" set not null;

alter table "public"."ticket_activities" alter column "mentioned_user_ids" set default ARRAY[]::uuid[];

alter table "public"."tickets" drop column "tags";

alter table "public"."tickets" alter column "created_at" set not null;

alter table "public"."tickets" alter column "created_by" set not null;

alter table "public"."tickets" alter column "description" set not null;

alter table "public"."tickets" alter column "id" set default uuid_generate_v4();

alter table "public"."tickets" alter column "metadata" set not null;

alter table "public"."tickets" alter column "priority" set default 'medium'::text;

alter table "public"."tickets" alter column "updated_at" set not null;

alter sequence "public"."debug_log_id_seq" owned by "public"."debug_log"."id";

CREATE UNIQUE INDEX debug_log_pkey ON public.debug_log USING btree (id);

CREATE INDEX idx_notif_activity ON public.notifications USING btree (activity_id);

CREATE INDEX idx_notif_user ON public.notifications USING btree (user_id);

CREATE INDEX idx_notifications_activity_id ON public.notifications USING btree (activity_id);

CREATE INDEX idx_ta_actor ON public.ticket_activities USING btree (actor_id);

CREATE INDEX idx_ta_ticket_created ON public.ticket_activities USING btree (ticket_id, created_at DESC);

CREATE INDEX idx_ticket_activities_actor_id ON public.ticket_activities USING btree (actor_id);

CREATE INDEX idx_ticket_activities_ticket_id ON public.ticket_activities USING btree (ticket_id);

CREATE INDEX internal_notes_created_at_idx ON public.internal_notes USING btree (created_at);

CREATE INDEX internal_notes_ticket_id_idx ON public.internal_notes USING btree (ticket_id);

CREATE INDEX quick_responses_category_id_idx ON public.quick_responses USING btree (category_id);

CREATE INDEX quick_responses_created_by_idx ON public.quick_responses USING btree (created_by);

CREATE UNIQUE INDEX quick_responses_pkey ON public.quick_responses USING btree (id);

CREATE UNIQUE INDEX response_categories_name_key ON public.response_categories USING btree (name);

CREATE UNIQUE INDEX response_categories_pkey ON public.response_categories USING btree (id);

CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE INDEX ticket_history_created_at_idx ON public.ticket_history USING btree (created_at);

CREATE UNIQUE INDEX ticket_history_pkey ON public.ticket_history USING btree (id);

CREATE INDEX ticket_history_ticket_id_idx ON public.ticket_history USING btree (ticket_id);

CREATE INDEX ticket_messages_created_at_idx ON public.ticket_messages USING btree (created_at);

CREATE UNIQUE INDEX ticket_messages_pkey ON public.ticket_messages USING btree (id);

CREATE INDEX ticket_messages_ticket_id_idx ON public.ticket_messages USING btree (ticket_id);

CREATE UNIQUE INDEX ticket_tags_pkey ON public.ticket_tags USING btree (ticket_id, tag_id);

CREATE INDEX ticket_tags_tag_id_idx ON public.ticket_tags USING btree (tag_id);

CREATE INDEX ticket_tags_ticket_id_idx ON public.ticket_tags USING btree (ticket_id);

CREATE INDEX tickets_created_at_idx ON public.tickets USING btree (created_at);

CREATE INDEX tickets_created_by_idx ON public.tickets USING btree (created_by);

CREATE INDEX tickets_priority_idx ON public.tickets USING btree (priority);

CREATE INDEX tickets_status_idx ON public.tickets USING btree (status);

alter table "public"."debug_log" add constraint "debug_log_pkey" PRIMARY KEY using index "debug_log_pkey";

alter table "public"."quick_responses" add constraint "quick_responses_pkey" PRIMARY KEY using index "quick_responses_pkey";

alter table "public"."response_categories" add constraint "response_categories_pkey" PRIMARY KEY using index "response_categories_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."ticket_history" add constraint "ticket_history_pkey" PRIMARY KEY using index "ticket_history_pkey";

alter table "public"."ticket_messages" add constraint "ticket_messages_pkey" PRIMARY KEY using index "ticket_messages_pkey";

alter table "public"."ticket_tags" add constraint "ticket_tags_pkey" PRIMARY KEY using index "ticket_tags_pkey";

alter table "public"."internal_notes" add constraint "fk_ticket" FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE not valid;

alter table "public"."internal_notes" validate constraint "fk_ticket";

alter table "public"."notifications" add constraint "notif_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES ticket_activities(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notif_activity_id_fkey";

alter table "public"."notifications" add constraint "notif_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_secure(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notif_user_id_fkey";

alter table "public"."quick_responses" add constraint "fk_created_by" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."quick_responses" validate constraint "fk_created_by";

alter table "public"."quick_responses" add constraint "quick_responses_category_id_fkey" FOREIGN KEY (category_id) REFERENCES response_categories(id) ON DELETE CASCADE not valid;

alter table "public"."quick_responses" validate constraint "quick_responses_category_id_fkey";

alter table "public"."response_categories" add constraint "fk_created_by" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."response_categories" validate constraint "fk_created_by";

alter table "public"."response_categories" add constraint "response_categories_name_key" UNIQUE using index "response_categories_name_key";

alter table "public"."tags" add constraint "tags_name_key" UNIQUE using index "tags_name_key";

alter table "public"."ticket_activities" add constraint "ticket_activities_activity_type_check" CHECK ((activity_type = ANY (ARRAY['comment'::text, 'status_change'::text, 'field_change'::text, 'assignment'::text]))) not valid;

alter table "public"."ticket_activities" validate constraint "ticket_activities_activity_type_check";

alter table "public"."ticket_activities" add constraint "ticket_activities_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_activities" validate constraint "ticket_activities_ticket_id_fkey";

alter table "public"."ticket_history" add constraint "ticket_history_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_history" validate constraint "ticket_history_ticket_id_fkey";

alter table "public"."ticket_messages" add constraint "fk_ticket" FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_messages" validate constraint "fk_ticket";

alter table "public"."ticket_messages" add constraint "ticket_messages_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_messages" validate constraint "ticket_messages_ticket_id_fkey";

alter table "public"."ticket_messages" add constraint "ticket_messages_type_check" CHECK ((type = ANY (ARRAY['customer'::text, 'agent'::text]))) not valid;

alter table "public"."ticket_messages" validate constraint "ticket_messages_type_check";

alter table "public"."ticket_tags" add constraint "ticket_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_tags" validate constraint "ticket_tags_tag_id_fkey";

alter table "public"."ticket_tags" add constraint "ticket_tags_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_tags" validate constraint "ticket_tags_ticket_id_fkey";

alter table "public"."tickets" add constraint "tickets_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_priority_check";

alter table "public"."tickets" add constraint "tickets_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, new.raw_user_meta_data->>'role');
    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(user_id uuid, notification_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.record_ticket_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_mention_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."debug_log" to "anon";

grant insert on table "public"."debug_log" to "anon";

grant references on table "public"."debug_log" to "anon";

grant select on table "public"."debug_log" to "anon";

grant trigger on table "public"."debug_log" to "anon";

grant truncate on table "public"."debug_log" to "anon";

grant update on table "public"."debug_log" to "anon";

grant delete on table "public"."debug_log" to "authenticated";

grant insert on table "public"."debug_log" to "authenticated";

grant references on table "public"."debug_log" to "authenticated";

grant select on table "public"."debug_log" to "authenticated";

grant trigger on table "public"."debug_log" to "authenticated";

grant truncate on table "public"."debug_log" to "authenticated";

grant update on table "public"."debug_log" to "authenticated";

grant delete on table "public"."debug_log" to "service_role";

grant insert on table "public"."debug_log" to "service_role";

grant references on table "public"."debug_log" to "service_role";

grant select on table "public"."debug_log" to "service_role";

grant trigger on table "public"."debug_log" to "service_role";

grant truncate on table "public"."debug_log" to "service_role";

grant update on table "public"."debug_log" to "service_role";

grant delete on table "public"."quick_responses" to "anon";

grant insert on table "public"."quick_responses" to "anon";

grant references on table "public"."quick_responses" to "anon";

grant select on table "public"."quick_responses" to "anon";

grant trigger on table "public"."quick_responses" to "anon";

grant truncate on table "public"."quick_responses" to "anon";

grant update on table "public"."quick_responses" to "anon";

grant delete on table "public"."quick_responses" to "authenticated";

grant insert on table "public"."quick_responses" to "authenticated";

grant references on table "public"."quick_responses" to "authenticated";

grant select on table "public"."quick_responses" to "authenticated";

grant trigger on table "public"."quick_responses" to "authenticated";

grant truncate on table "public"."quick_responses" to "authenticated";

grant update on table "public"."quick_responses" to "authenticated";

grant delete on table "public"."quick_responses" to "service_role";

grant insert on table "public"."quick_responses" to "service_role";

grant references on table "public"."quick_responses" to "service_role";

grant select on table "public"."quick_responses" to "service_role";

grant trigger on table "public"."quick_responses" to "service_role";

grant truncate on table "public"."quick_responses" to "service_role";

grant update on table "public"."quick_responses" to "service_role";

grant delete on table "public"."response_categories" to "anon";

grant insert on table "public"."response_categories" to "anon";

grant references on table "public"."response_categories" to "anon";

grant select on table "public"."response_categories" to "anon";

grant trigger on table "public"."response_categories" to "anon";

grant truncate on table "public"."response_categories" to "anon";

grant update on table "public"."response_categories" to "anon";

grant delete on table "public"."response_categories" to "authenticated";

grant insert on table "public"."response_categories" to "authenticated";

grant references on table "public"."response_categories" to "authenticated";

grant select on table "public"."response_categories" to "authenticated";

grant trigger on table "public"."response_categories" to "authenticated";

grant truncate on table "public"."response_categories" to "authenticated";

grant update on table "public"."response_categories" to "authenticated";

grant delete on table "public"."response_categories" to "service_role";

grant insert on table "public"."response_categories" to "service_role";

grant references on table "public"."response_categories" to "service_role";

grant select on table "public"."response_categories" to "service_role";

grant trigger on table "public"."response_categories" to "service_role";

grant truncate on table "public"."response_categories" to "service_role";

grant update on table "public"."response_categories" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant delete on table "public"."tags" to "authenticated";

grant insert on table "public"."tags" to "authenticated";

grant references on table "public"."tags" to "authenticated";

grant select on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant update on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";

grant delete on table "public"."ticket_history" to "anon";

grant insert on table "public"."ticket_history" to "anon";

grant references on table "public"."ticket_history" to "anon";

grant select on table "public"."ticket_history" to "anon";

grant trigger on table "public"."ticket_history" to "anon";

grant truncate on table "public"."ticket_history" to "anon";

grant update on table "public"."ticket_history" to "anon";

grant delete on table "public"."ticket_history" to "authenticated";

grant insert on table "public"."ticket_history" to "authenticated";

grant references on table "public"."ticket_history" to "authenticated";

grant select on table "public"."ticket_history" to "authenticated";

grant trigger on table "public"."ticket_history" to "authenticated";

grant truncate on table "public"."ticket_history" to "authenticated";

grant update on table "public"."ticket_history" to "authenticated";

grant delete on table "public"."ticket_history" to "service_role";

grant insert on table "public"."ticket_history" to "service_role";

grant references on table "public"."ticket_history" to "service_role";

grant select on table "public"."ticket_history" to "service_role";

grant trigger on table "public"."ticket_history" to "service_role";

grant truncate on table "public"."ticket_history" to "service_role";

grant update on table "public"."ticket_history" to "service_role";

grant delete on table "public"."ticket_messages" to "anon";

grant insert on table "public"."ticket_messages" to "anon";

grant references on table "public"."ticket_messages" to "anon";

grant select on table "public"."ticket_messages" to "anon";

grant trigger on table "public"."ticket_messages" to "anon";

grant truncate on table "public"."ticket_messages" to "anon";

grant update on table "public"."ticket_messages" to "anon";

grant delete on table "public"."ticket_messages" to "authenticated";

grant insert on table "public"."ticket_messages" to "authenticated";

grant references on table "public"."ticket_messages" to "authenticated";

grant select on table "public"."ticket_messages" to "authenticated";

grant trigger on table "public"."ticket_messages" to "authenticated";

grant truncate on table "public"."ticket_messages" to "authenticated";

grant update on table "public"."ticket_messages" to "authenticated";

grant delete on table "public"."ticket_messages" to "service_role";

grant insert on table "public"."ticket_messages" to "service_role";

grant references on table "public"."ticket_messages" to "service_role";

grant select on table "public"."ticket_messages" to "service_role";

grant trigger on table "public"."ticket_messages" to "service_role";

grant truncate on table "public"."ticket_messages" to "service_role";

grant update on table "public"."ticket_messages" to "service_role";

grant delete on table "public"."ticket_tags" to "anon";

grant insert on table "public"."ticket_tags" to "anon";

grant references on table "public"."ticket_tags" to "anon";

grant select on table "public"."ticket_tags" to "anon";

grant trigger on table "public"."ticket_tags" to "anon";

grant truncate on table "public"."ticket_tags" to "anon";

grant update on table "public"."ticket_tags" to "anon";

grant delete on table "public"."ticket_tags" to "authenticated";

grant insert on table "public"."ticket_tags" to "authenticated";

grant references on table "public"."ticket_tags" to "authenticated";

grant select on table "public"."ticket_tags" to "authenticated";

grant trigger on table "public"."ticket_tags" to "authenticated";

grant truncate on table "public"."ticket_tags" to "authenticated";

grant update on table "public"."ticket_tags" to "authenticated";

grant delete on table "public"."ticket_tags" to "service_role";

grant insert on table "public"."ticket_tags" to "service_role";

grant references on table "public"."ticket_tags" to "service_role";

grant select on table "public"."ticket_tags" to "service_role";

grant trigger on table "public"."ticket_tags" to "service_role";

grant truncate on table "public"."ticket_tags" to "service_role";

grant update on table "public"."ticket_tags" to "service_role";

create policy "create_internal_notes"
on "public"."internal_notes"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM tickets t
  WHERE ((t.id = internal_notes.ticket_id) AND ((t.assignee = auth.uid()) OR (t.assignee IS NULL))))));


create policy "insert_internal_notes"
on "public"."internal_notes"
as permissive
for insert
to authenticated
with check ((auth.uid() IS NOT NULL));


create policy "view_internal_notes"
on "public"."internal_notes"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM tickets t
  WHERE ((t.id = internal_notes.ticket_id) AND ((t.assignee = auth.uid()) OR (t.assignee IS NULL))))));


create policy "notif_select_policy"
on "public"."notifications"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "notifications_insert_policy"
on "public"."notifications"
as permissive
for insert
to authenticated
with check (true);


create policy "Tags are viewable by authenticated users"
on "public"."tags"
as permissive
for select
to authenticated
using (true);


create policy "ta_select_policy"
on "public"."ticket_activities"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM users_secure us
  WHERE ((us.id = auth.uid()) AND (us.role = ANY (ARRAY['admin'::text, 'agent'::text]))))) OR (EXISTS ( SELECT 1
   FROM tickets t
  WHERE ((t.id = ticket_activities.ticket_id) AND ((t.created_by = auth.uid()) OR (t.assignee = auth.uid())))))));


create policy "Ticket messages are insertable by authenticated users"
on "public"."ticket_messages"
as permissive
for insert
to authenticated
with check (true);


create policy "Ticket messages are viewable by authenticated users"
on "public"."ticket_messages"
as permissive
for select
to authenticated
using (true);


create policy "Ticket tags are viewable by authenticated users"
on "public"."ticket_tags"
as permissive
for select
to authenticated
using (true);


create policy "Authenticated users can create tickets"
on "public"."tickets"
as permissive
for insert
to authenticated
with check (true);


create policy "Authenticated users can update tickets"
on "public"."tickets"
as permissive
for update
to authenticated
using (true);


create policy "Authenticated users can view all tickets"
on "public"."tickets"
as permissive
for select
to authenticated
using (true);


CREATE TRIGGER update_internal_notes_updated_at BEFORE UPDATE ON public.internal_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_responses_updated_at BEFORE UPDATE ON public.quick_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ticket_history_trigger AFTER UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION record_ticket_change();


