-- Migration to add tracking timestamps for dashboard activity sorting
alter table "public"."valve_records" add column "updated_at" timestamptz default now();
alter table "public"."valve_records" add column "last_viewed_at" timestamptz default now();
