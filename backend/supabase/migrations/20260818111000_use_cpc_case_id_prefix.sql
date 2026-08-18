-- Forward-compatible prefix correction for databases that received the first
-- allocator migration before the ClaimNX Case ID convention changed to CPC.
-- These values are internal ClaimNX identifiers, not insurer claim numbers.
update public.claims
set claim_number = 'CPC-' || regexp_replace(claim_number, '^CLM-', ''),
    case_ref_id = case
      when case_ref_id = claim_number then 'CPC-' || regexp_replace(claim_number, '^CLM-', '')
      else case_ref_id
    end
where claim_number ~ '^CLM-[0-9]+$';

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
