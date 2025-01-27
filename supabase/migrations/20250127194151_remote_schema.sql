drop trigger if exists "update_sla_policies_updated_at" on "public"."sla_policies";

drop trigger if exists "set_ticket_sla_deadlines" on "public"."tickets";

drop trigger if exists "update_ticket_sla_status" on "public"."tickets";

drop policy "admin_all" on "public"."sla_policies";

drop policy "view_active" on "public"."sla_policies";

drop policy "insert_ticket_activities" on "public"."ticket_activities";

drop policy "view_ticket_activities" on "public"."ticket_activities";

revoke delete on table "public"."sla_policies" from "anon";

revoke insert on table "public"."sla_policies" from "anon";

revoke references on table "public"."sla_policies" from "anon";

revoke select on table "public"."sla_policies" from "anon";

revoke trigger on table "public"."sla_policies" from "anon";

revoke truncate on table "public"."sla_policies" from "anon";

revoke update on table "public"."sla_policies" from "anon";

revoke delete on table "public"."sla_policies" from "authenticated";

revoke insert on table "public"."sla_policies" from "authenticated";

revoke references on table "public"."sla_policies" from "authenticated";

revoke select on table "public"."sla_policies" from "authenticated";

revoke trigger on table "public"."sla_policies" from "authenticated";

revoke truncate on table "public"."sla_policies" from "authenticated";

revoke update on table "public"."sla_policies" from "authenticated";

revoke delete on table "public"."sla_policies" from "service_role";

revoke insert on table "public"."sla_policies" from "service_role";

revoke references on table "public"."sla_policies" from "service_role";

revoke select on table "public"."sla_policies" from "service_role";

revoke trigger on table "public"."sla_policies" from "service_role";

revoke truncate on table "public"."sla_policies" from "service_role";

revoke update on table "public"."sla_policies" from "service_role";

alter table "public"."sla_policies" drop constraint "sla_policies_resolution_time_hours_check";

alter table "public"."sla_policies" drop constraint "sla_policies_response_time_hours_check";

alter table "public"."ticket_activities" drop constraint "ticket_activities_actor_id_fkey";

drop function if exists "public"."calculate_sla_deadlines"();

drop view if exists "public"."columns";

drop function if exists "public"."get_columns"();

drop function if exists "public"."get_constraints"();

drop function if exists "public"."get_schema_info"(query text);

drop view if exists "public"."schema_columns";

drop view if exists "public"."schema_constraints";

drop view if exists "public"."sla_monitoring";

drop view if exists "public"."table_constraints";

drop function if exists "public"."update_sla_status"();

alter table "public"."sla_policies" drop constraint "sla_policies_pkey";

drop index if exists "public"."sla_policies_pkey";

drop index if exists "public"."unique_active_priority";

drop table "public"."sla_policies";

alter table "public"."tickets" drop column "first_response_at";

alter table "public"."tickets" drop column "resolution_at";

alter table "public"."tickets" drop column "sla_resolution_deadline";

alter table "public"."tickets" drop column "sla_resolution_status";

alter table "public"."tickets" drop column "sla_response_deadline";

alter table "public"."tickets" drop column "sla_response_status";

alter table "public"."tickets" alter column "priority" set default 'medium'::text;

alter table "public"."tickets" alter column "priority" set data type text using "priority"::text;

drop type "public"."sla_priority";

drop type "public"."sla_status";

CREATE INDEX tickets_priority_idx ON public.tickets USING btree (priority);

alter table "public"."notifications" add constraint "notif_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES ticket_activities(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notif_activity_id_fkey";

alter table "public"."notifications" add constraint "notifications_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES ticket_activities(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_activity_id_fkey";

alter table "public"."ticket_activities" add constraint "ta_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES users_secure(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_activities" validate constraint "ta_actor_id_fkey";

alter table "public"."ticket_activities" add constraint "ticket_activities_activity_type_check" CHECK ((activity_type = ANY (ARRAY['comment'::text, 'status_change'::text, 'field_change'::text, 'assignment'::text]))) not valid;

alter table "public"."ticket_activities" validate constraint "ticket_activities_activity_type_check";

alter table "public"."tickets" add constraint "tickets_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_priority_check";

create policy "delete_ticket_activities"
on "public"."ticket_activities"
as permissive
for delete
to authenticated
using (((EXISTS ( SELECT 1
   FROM users_secure us
  WHERE ((us.id = auth.uid()) AND (us.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM users_secure us
  WHERE ((us.id = auth.uid()) AND (us.role = 'agent'::text) AND (ticket_activities.actor_id = auth.uid()) AND (ticket_activities.activity_type = 'comment'::text)))) OR (EXISTS ( SELECT 1
   FROM users_secure us
  WHERE ((us.id = auth.uid()) AND (us.role = 'user'::text) AND (ticket_activities.actor_id = auth.uid()) AND (ticket_activities.activity_type = 'comment'::text) AND (((ticket_activities.content ->> 'is_internal'::text))::boolean IS NOT TRUE))))));


create policy "insert_ticket_activities"
on "public"."ticket_activities"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM tickets t
  WHERE ((t.id = ticket_activities.ticket_id) AND ((EXISTS ( SELECT 1
           FROM users_secure us
          WHERE ((us.id = auth.uid()) AND (us.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
           FROM users_secure us
          WHERE ((us.id = auth.uid()) AND (us.role = 'agent'::text)))) OR (EXISTS ( SELECT 1
           FROM users_secure us
          WHERE ((us.id = auth.uid()) AND (us.role = 'user'::text) AND (t.created_by = auth.uid()) AND (ticket_activities.activity_type = 'comment'::text) AND (((ticket_activities.content ->> 'is_internal'::text))::boolean IS NOT TRUE)))))))));


create policy "view_ticket_activities"
on "public"."ticket_activities"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM tickets t
  WHERE ((t.id = ticket_activities.ticket_id) AND ((EXISTS ( SELECT 1
           FROM users_secure us
          WHERE ((us.id = auth.uid()) AND (us.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
           FROM users_secure us
          WHERE ((us.id = auth.uid()) AND (us.role = 'agent'::text)))) OR (EXISTS ( SELECT 1
           FROM users_secure us
          WHERE ((us.id = auth.uid()) AND (us.role = 'user'::text) AND (t.created_by = auth.uid()) AND ((ticket_activities.activity_type = 'status_change'::text) OR ((ticket_activities.activity_type = 'comment'::text) AND (((ticket_activities.content ->> 'is_internal'::text))::boolean IS NOT TRUE)))))))))));



