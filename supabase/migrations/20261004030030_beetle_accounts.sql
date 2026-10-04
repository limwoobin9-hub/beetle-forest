create table public.beetle_world_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  world text not null check (world in ('real','virtual')),
  state jsonb not null check (jsonb_typeof(state)='object' and octet_length(state::text)<=2000000),
  ui jsonb not null default '{}'::jsonb check (jsonb_typeof(ui)='object' and octet_length(ui::text)<=100000),
  revision bigint not null default 1 check (revision>0),
  updated_at timestamptz not null default now(),
  primary key (user_id,world)
);
alter table public.beetle_world_saves enable row level security;
revoke all on public.beetle_world_saves from anon, authenticated;
grant select, insert, update on public.beetle_world_saves to authenticated;
create policy beetle_own_read on public.beetle_world_saves for select to authenticated
  using (user_id=(select auth.uid()) and (select auth.jwt()->'app_metadata'->>'app')='beetle-forest');
create policy beetle_own_insert on public.beetle_world_saves for insert to authenticated
  with check (user_id=(select auth.uid()) and (select auth.jwt()->'app_metadata'->>'app')='beetle-forest');
create policy beetle_own_update on public.beetle_world_saves for update to authenticated
  using (user_id=(select auth.uid()) and (select auth.jwt()->'app_metadata'->>'app')='beetle-forest')
  with check (user_id=(select auth.uid()) and (select auth.jwt()->'app_metadata'->>'app')='beetle-forest');

-- Optimistic concurrency prevents an older device overwriting another device.
create function public.beetle_save_world(p_world text,p_state jsonb,p_ui jsonb,p_revision bigint)
returns bigint language plpgsql security invoker set search_path='' as $$
declare next_revision bigint;
begin
  if p_revision=0 then
    insert into public.beetle_world_saves(user_id,world,state,ui)
      values(auth.uid(),p_world,p_state,p_ui)
      on conflict(user_id,world) do nothing returning revision into next_revision;
  else
    update public.beetle_world_saves set state=p_state,ui=p_ui,revision=revision+1,updated_at=now()
      where user_id=auth.uid() and world=p_world and revision=p_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'FOREST_CONFLICT' using errcode='P0001'; end if;
  return next_revision;
end;
$$;
revoke all on function public.beetle_save_world(text,jsonb,jsonb,bigint) from public, anon;
grant execute on function public.beetle_save_world(text,jsonb,jsonb,bigint) to authenticated;

-- Only the authentication function can consume these persistent limits.
create table public.beetle_auth_limits (
  fingerprint text primary key,
  window_started timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.beetle_auth_limits enable row level security;
revoke all on public.beetle_auth_limits from public,anon,authenticated;
grant all on public.beetle_auth_limits to service_role;
create function public.beetle_consume_auth_limit(p_fingerprint text,p_seconds integer,p_max integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare count_now integer;
begin
  delete from public.beetle_auth_limits where window_started<now()-interval '1 day';
  insert into public.beetle_auth_limits as limits(fingerprint) values(p_fingerprint)
    on conflict(fingerprint) do update set
      attempts=case when limits.window_started<now()-make_interval(secs=>p_seconds) then 1 else limits.attempts+1 end,
      window_started=case when limits.window_started<now()-make_interval(secs=>p_seconds) then now() else limits.window_started end
    returning attempts into count_now;
  return count_now<=p_max;
end;
$$;
revoke all on function public.beetle_consume_auth_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.beetle_consume_auth_limit(text,integer,integer) to service_role;
