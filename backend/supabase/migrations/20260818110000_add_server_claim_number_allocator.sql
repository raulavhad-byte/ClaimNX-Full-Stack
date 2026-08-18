-- User-facing Case IDs are allocated only by PostgreSQL. A row-level atomic
-- increment prevents duplicates when multiple hospitals create a case at the
-- same time. The sequence is global because Case ID is used across ClaimNX
-- reports, emails and support workflows.
create table if not exists public.claim_case_number_sequence (
  sequence_key text primary key default 'global',
  last_value bigint not null check (last_value >= 100),
  updated_at timestamptz not null default now()
);

-- Convert the old zero-padded demo-style values once, in creation order.
-- Existing normal serial IDs are intentionally preserved to avoid changing
-- references already sent to insurers or hospitals.
with current_max as (
  select greatest(
    100,
    coalesce(max(nullif(regexp_replace(claim_number, '^(CPC|CLM)-', ''), '')::bigint), 0)
  ) as value
  from public.claims
), legacy as (
  select
    id,
    'CPC-' || ((select value from current_max) + row_number() over (order by created_at, id))::text as new_number
  from public.claims
  where claim_number ~ '^(CPC|CLM)-0+[0-9]+$'
)
update public.claims as claim
set claim_number = legacy.new_number,
    case_ref_id = case
      when claim.case_ref_id ~ '^(CPC|CLM)-0+[0-9]+$' then legacy.new_number
      else claim.case_ref_id
    end
from legacy
where claim.id = legacy.id;

insert into public.claim_case_number_sequence (sequence_key, last_value)
select
  'global',
  greatest(
    100,
    coalesce(max(nullif(regexp_replace(coalesce(claim_number, case_ref_id, ''), '^(CPC|CLM)-0*', ''), '')::bigint), 0)
  )
from public.claims
where coalesce(claim_number, case_ref_id, '') ~ '^(CPC|CLM)-[0-9]+$'
on conflict (sequence_key) do update
set last_value = greatest(public.claim_case_number_sequence.last_value, excluded.last_value),
    updated_at = now();

-- PostgreSQL cannot change a function return type with CREATE OR REPLACE.
-- Remove the legacy allocator first; this function has no persistent data.
drop function if exists public.allocate_claim_number(uuid);

create function public.allocate_claim_number(p_organization_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value bigint;
begin
  -- p_organization_id is retained for API compatibility and future scoped
  -- numbering. ClaimNX Case IDs are presently global by design.
  update public.claim_case_number_sequence
  set last_value = last_value + 1,
      updated_at = now()
  where sequence_key = 'global'
  returning last_value into next_value;

  if next_value is null then
    raise exception 'Claim case-number sequence is unavailable';
  end if;

  return 'CPC-' || next_value::text;
end;
$$;

revoke all on function public.allocate_claim_number(uuid) from public;
grant execute on function public.allocate_claim_number(uuid) to authenticated, service_role;
