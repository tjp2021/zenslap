drop trigger if exists "update_emergency_contacts_updated_at" on "public"."emergency_contacts";

drop policy "Staff can view audit log" on "public"."audit_log";

drop policy "Staff can manage emergency contacts" on "public"."emergency_contacts";

drop policy "Staff can manage interventions" on "public"."interventions";

drop policy "Staff can view message queue" on "public"."message_queue";

drop policy "Staff can view performance metrics" on "public"."performance_metrics";

revoke delete on table "public"."audit_log" from "anon";

revoke insert on table "public"."audit_log" from "anon";

revoke references on table "public"."audit_log" from "anon";

revoke select on table "public"."audit_log" from "anon";

revoke trigger on table "public"."audit_log" from "anon";

revoke truncate on table "public"."audit_log" from "anon";

revoke update on table "public"."audit_log" from "anon";

revoke delete on table "public"."audit_log" from "authenticated";

revoke insert on table "public"."audit_log" from "authenticated";

revoke references on table "public"."audit_log" from "authenticated";

revoke select on table "public"."audit_log" from "authenticated";

revoke trigger on table "public"."audit_log" from "authenticated";

revoke truncate on table "public"."audit_log" from "authenticated";

revoke update on table "public"."audit_log" from "authenticated";

revoke delete on table "public"."audit_log" from "service_role";

revoke insert on table "public"."audit_log" from "service_role";

revoke references on table "public"."audit_log" from "service_role";

revoke select on table "public"."audit_log" from "service_role";

revoke trigger on table "public"."audit_log" from "service_role";

revoke truncate on table "public"."audit_log" from "service_role";

revoke update on table "public"."audit_log" from "service_role";

revoke delete on table "public"."emergency_contacts" from "anon";

revoke insert on table "public"."emergency_contacts" from "anon";

revoke references on table "public"."emergency_contacts" from "anon";

revoke select on table "public"."emergency_contacts" from "anon";

revoke trigger on table "public"."emergency_contacts" from "anon";

revoke truncate on table "public"."emergency_contacts" from "anon";

revoke update on table "public"."emergency_contacts" from "anon";

revoke delete on table "public"."emergency_contacts" from "authenticated";

revoke insert on table "public"."emergency_contacts" from "authenticated";

revoke references on table "public"."emergency_contacts" from "authenticated";

revoke select on table "public"."emergency_contacts" from "authenticated";

revoke trigger on table "public"."emergency_contacts" from "authenticated";

revoke truncate on table "public"."emergency_contacts" from "authenticated";

revoke update on table "public"."emergency_contacts" from "authenticated";

revoke delete on table "public"."emergency_contacts" from "service_role";

revoke insert on table "public"."emergency_contacts" from "service_role";

revoke references on table "public"."emergency_contacts" from "service_role";

revoke select on table "public"."emergency_contacts" from "service_role";

revoke trigger on table "public"."emergency_contacts" from "service_role";

revoke truncate on table "public"."emergency_contacts" from "service_role";

revoke update on table "public"."emergency_contacts" from "service_role";

revoke delete on table "public"."interventions" from "anon";

revoke insert on table "public"."interventions" from "anon";

revoke references on table "public"."interventions" from "anon";

revoke select on table "public"."interventions" from "anon";

revoke trigger on table "public"."interventions" from "anon";

revoke truncate on table "public"."interventions" from "anon";

revoke update on table "public"."interventions" from "anon";

revoke delete on table "public"."interventions" from "authenticated";

revoke insert on table "public"."interventions" from "authenticated";

revoke references on table "public"."interventions" from "authenticated";

revoke select on table "public"."interventions" from "authenticated";

revoke trigger on table "public"."interventions" from "authenticated";

revoke truncate on table "public"."interventions" from "authenticated";

revoke update on table "public"."interventions" from "authenticated";

revoke delete on table "public"."interventions" from "service_role";

revoke insert on table "public"."interventions" from "service_role";

revoke references on table "public"."interventions" from "service_role";

revoke select on table "public"."interventions" from "service_role";

revoke trigger on table "public"."interventions" from "service_role";

revoke truncate on table "public"."interventions" from "service_role";

revoke update on table "public"."interventions" from "service_role";

revoke delete on table "public"."message_queue" from "anon";

revoke insert on table "public"."message_queue" from "anon";

revoke references on table "public"."message_queue" from "anon";

revoke select on table "public"."message_queue" from "anon";

revoke trigger on table "public"."message_queue" from "anon";

revoke truncate on table "public"."message_queue" from "anon";

revoke update on table "public"."message_queue" from "anon";

revoke delete on table "public"."message_queue" from "authenticated";

revoke insert on table "public"."message_queue" from "authenticated";

revoke references on table "public"."message_queue" from "authenticated";

revoke select on table "public"."message_queue" from "authenticated";

revoke trigger on table "public"."message_queue" from "authenticated";

revoke truncate on table "public"."message_queue" from "authenticated";

revoke update on table "public"."message_queue" from "authenticated";

revoke delete on table "public"."message_queue" from "service_role";

revoke insert on table "public"."message_queue" from "service_role";

revoke references on table "public"."message_queue" from "service_role";

revoke select on table "public"."message_queue" from "service_role";

revoke trigger on table "public"."message_queue" from "service_role";

revoke truncate on table "public"."message_queue" from "service_role";

revoke update on table "public"."message_queue" from "service_role";

revoke delete on table "public"."performance_metrics" from "anon";

revoke insert on table "public"."performance_metrics" from "anon";

revoke references on table "public"."performance_metrics" from "anon";

revoke select on table "public"."performance_metrics" from "anon";

revoke trigger on table "public"."performance_metrics" from "anon";

revoke truncate on table "public"."performance_metrics" from "anon";

revoke update on table "public"."performance_metrics" from "anon";

revoke delete on table "public"."performance_metrics" from "authenticated";

revoke insert on table "public"."performance_metrics" from "authenticated";

revoke references on table "public"."performance_metrics" from "authenticated";

revoke select on table "public"."performance_metrics" from "authenticated";

revoke trigger on table "public"."performance_metrics" from "authenticated";

revoke truncate on table "public"."performance_metrics" from "authenticated";

revoke update on table "public"."performance_metrics" from "authenticated";

revoke delete on table "public"."performance_metrics" from "service_role";

revoke insert on table "public"."performance_metrics" from "service_role";

revoke references on table "public"."performance_metrics" from "service_role";

revoke select on table "public"."performance_metrics" from "service_role";

revoke trigger on table "public"."performance_metrics" from "service_role";

revoke truncate on table "public"."performance_metrics" from "service_role";

revoke update on table "public"."performance_metrics" from "service_role";

alter table "public"."audit_log" drop constraint "audit_log_actor_id_fkey";

alter table "public"."interventions" drop constraint "interventions_responder_id_fkey";

alter table "public"."interventions" drop constraint "interventions_ticket_id_fkey";

drop function if exists "public"."update_emergency_contacts_updated_at"();

alter table "public"."audit_log" drop constraint "audit_log_pkey";

alter table "public"."emergency_contacts" drop constraint "emergency_contacts_pkey";

alter table "public"."interventions" drop constraint "interventions_pkey";

alter table "public"."message_queue" drop constraint "message_queue_pkey";

alter table "public"."performance_metrics" drop constraint "performance_metrics_pkey";

drop index if exists "public"."audit_log_pkey";

drop index if exists "public"."emergency_contacts_pkey";

drop index if exists "public"."idx_audit_log_entity";

drop index if exists "public"."idx_audit_log_event_type";

drop index if exists "public"."idx_interventions_status";

drop index if exists "public"."idx_interventions_ticket";

drop index if exists "public"."idx_message_queue_status_priority";

drop index if exists "public"."idx_performance_metrics_type";

drop index if exists "public"."interventions_pkey";

drop index if exists "public"."message_queue_pkey";

drop index if exists "public"."performance_metrics_pkey";

drop table "public"."audit_log";

drop table "public"."emergency_contacts";

drop table "public"."interventions";

drop table "public"."message_queue";

drop table "public"."performance_metrics";

drop type "public"."contact_type";

drop type "public"."event_type";

drop type "public"."intervention_status";

drop type "public"."intervention_type";

drop type "public"."message_status";

drop type "public"."metric_type";


