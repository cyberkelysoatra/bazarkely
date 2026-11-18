create role service_role; create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.users (id uuid primary key, role text, preferences jsonb);
insert into auth.users values
('00000000-0000-0000-0000-000000000001','p@x.mg','{"full_name":"P"}'),('00000000-0000-0000-0000-000000000002','r@x.mg','{}'),
('00000000-0000-0000-0000-000000000003','c@x.mg','{}'),('00000000-0000-0000-0000-000000000004','n@x.mg','{}');
insert into public.users values ('00000000-0000-0000-0000-000000000001','admin','{"modules":["bazarkely"],"moduleOrder":["x"]}'),
('00000000-0000-0000-0000-000000000002','user',null),('00000000-0000-0000-0000-000000000003','user','{}'),('00000000-0000-0000-0000-000000000004','user',null);
