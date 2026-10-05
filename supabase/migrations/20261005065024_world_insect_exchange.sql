-- Both saves are locked and updated in one transaction. RLS limits all reads
-- and writes to the authenticated forest account; no elevated privileges.
create or replace function public.beetle_exchange_worlds(
 p_real jsonb,p_real_ui jsonb,p_real_revision bigint,
 p_virtual jsonb,p_virtual_ui jsonb,p_virtual_revision bigint
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 old_real public.beetle_world_saves%rowtype;
 old_virtual public.beetle_world_saves%rowtype;
 real_bug jsonb; virtual_bug jsonb; incoming_real jsonb; incoming_virtual jsonb;
 real_id text; virtual_id text; stamp bigint;
 ignored text[]:=array['born','bredDay','fightDay','trainDay','xp_jelly','xp_clean','lineage','parents','worldOrigin'];
begin
 if auth.uid() is null or (auth.jwt()->'app_metadata'->>'app') is distinct from 'beetle-forest' then
  raise exception 'FOREST_UNAUTHORIZED';
 end if;
 select * into old_real from public.beetle_world_saves where user_id=auth.uid() and world='real' for update;
 select * into old_virtual from public.beetle_world_saves where user_id=auth.uid() and world='virtual' for update;
 if old_real.revision is distinct from p_real_revision or old_virtual.revision is distinct from p_virtual_revision then
  raise exception 'FOREST_CONFLICT';
 end if;
 stamp:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 if greatest(coalesce((old_real.state#>>'{worldExchange,lastAt}')::bigint,0),coalesce((old_virtual.state#>>'{worldExchange,lastAt}')::bigint,0))+604800000>stamp then
  raise exception 'FOREST_COOLDOWN';
 end if;
 if jsonb_typeof(p_real->'bugs') is distinct from 'array' or jsonb_typeof(p_virtual->'bugs') is distinct from 'array'
  or (p_real#>>'{settings,realTime}') is distinct from 'true' or (p_virtual#>>'{settings,realTime}') is distinct from 'false'
  or jsonb_array_length(p_real->'bugs')<>jsonb_array_length(old_real.state->'bugs')
  or jsonb_array_length(p_virtual->'bugs')<>jsonb_array_length(old_virtual.state->'bugs') then
  raise exception 'FOREST_INVALID_EXCHANGE';
 end if;
 -- Exactly one adult leaves each save; every other adult stays unchanged.
 if (select count(*) from jsonb_array_elements(old_real.state->'bugs') b where not exists(select 1 from jsonb_array_elements(p_real->'bugs') n where n->>'id'=b->>'id'))<>1
  or (select count(*) from jsonb_array_elements(old_virtual.state->'bugs') b where not exists(select 1 from jsonb_array_elements(p_virtual->'bugs') n where n->>'id'=b->>'id'))<>1 then
  raise exception 'FOREST_INVALID_EXCHANGE';
 end if;
 select b into real_bug from jsonb_array_elements(old_real.state->'bugs') b where not exists(select 1 from jsonb_array_elements(p_real->'bugs') n where n->>'id'=b->>'id');
 select b into virtual_bug from jsonb_array_elements(old_virtual.state->'bugs') b where not exists(select 1 from jsonb_array_elements(p_virtual->'bugs') n where n->>'id'=b->>'id');
 real_id:=real_bug->>'id';virtual_id:=virtual_bug->>'id';
 select b into incoming_real from jsonb_array_elements(p_real->'bugs') b where b->>'id'=virtual_id;
 select b into incoming_virtual from jsonb_array_elements(p_virtual->'bugs') b where b->>'id'=real_id;
 if incoming_real is null or incoming_virtual is null or real_id=virtual_id
  or (incoming_real-ignored) is distinct from (virtual_bug-ignored)
  or (incoming_virtual-ignored) is distinct from (real_bug-ignored)
  or exists(select 1 from jsonb_array_elements(old_real.state->'bugs') b where b->>'id'<>real_id and not exists(select 1 from jsonb_array_elements(p_real->'bugs') n where n=b))
  or exists(select 1 from jsonb_array_elements(old_virtual.state->'bugs') b where b->>'id'<>virtual_id and not exists(select 1 from jsonb_array_elements(p_virtual->'bugs') n where n=b))
  or (old_real.state#>>'{fight,bugId}'=real_id and old_real.state#>>'{fight,finished}'='false')
  or (old_virtual.state#>>'{fight,bugId}'=virtual_id and old_virtual.state#>>'{fight,finished}'='false') then
  raise exception 'FOREST_INVALID_EXCHANGE';
 end if;
 -- Supplies, money, broods and all unrelated progress stay in their forest.
 if (p_real-array['bugs','fight','lines','records','discoveries','log','worldExchange']) is distinct from (old_real.state-array['bugs','fight','lines','records','discoveries','log','worldExchange'])
  or (p_virtual-array['bugs','fight','lines','records','discoveries','log','worldExchange']) is distinct from (old_virtual.state-array['bugs','fight','lines','records','discoveries','log','worldExchange']) then
  raise exception 'FOREST_INVALID_EXCHANGE';
 end if;
 p_real:=jsonb_set(p_real,'{worldExchange}',jsonb_build_object('lastAt',stamp));
 p_virtual:=jsonb_set(p_virtual,'{worldExchange}',jsonb_build_object('lastAt',stamp));
 update public.beetle_world_saves set state=p_real,ui=p_real_ui,revision=revision+1,updated_at=now() where user_id=auth.uid() and world='real';
 update public.beetle_world_saves set state=p_virtual,ui=p_virtual_ui,revision=revision+1,updated_at=now() where user_id=auth.uid() and world='virtual';
 return jsonb_build_object('real',old_real.revision+1,'virtual',old_virtual.revision+1,'lastAt',stamp);
end;
$$;
revoke all on function public.beetle_exchange_worlds(jsonb,jsonb,bigint,jsonb,jsonb,bigint) from public,anon;
grant execute on function public.beetle_exchange_worlds(jsonb,jsonb,bigint,jsonb,jsonb,bigint) to authenticated;
