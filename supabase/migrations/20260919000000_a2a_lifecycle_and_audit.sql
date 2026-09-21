begin;

alter type public.agent_execution_status add value if not exists 'cancelled';
alter type public.agent_execution_status add value if not exists 'expired';
alter type public.agent_execution_status add value if not exists 'input_required';

alter table public.agent_task_executions
    add column if not exists a2a_task_id text,
    add column if not exists trace_id text,
    add column if not exists parent_task_id text,
    add column if not exists depth integer not null default 0,
    add column if not exists cost_minor_units integer not null default 0,
    add column if not exists age_tier text,
    add column if not exists policy_snapshot_id text,
    add column if not exists cosign_state text,
    add column if not exists expires_at timestamptz,
    add column if not exists cancelled_at timestamptz,
    add column if not exists audit_sequence bigint;

create unique index if not exists agent_task_a2a_task_id_key
    on public.agent_task_executions (a2a_task_id)
    where a2a_task_id is not null;

create table if not exists public.a2a_audit_entries (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    sequence        bigint not null,
    action          text not null,
    actor_type      text not null,
    actor_id        text,
    actor_jti       text,
    target_type     text,
    target_id       text,
    outcome         text not null,
    payload         jsonb,
    prev_hash       text not null,
    entry_hash      text not null,
    created_at      timestamptz not null default now(),
    constraint a2a_audit_org_sequence_key unique (organization_id, sequence)
);

create index if not exists a2a_audit_org_created_idx
    on public.a2a_audit_entries (organization_id, created_at);

create index if not exists a2a_audit_action_idx
    on public.a2a_audit_entries (action);

-- Append-only enforcement lives in a trigger (not in RLS policy) so it binds
-- privileged roles too: integrity repair appends a correcting entry instead of
-- editing history (ADR-0004, P8 rule 6).
create or replace function public.a2a_audit_reject_mutation() returns trigger
language plpgsql
as $$
begin
    raise exception 'a2a_audit_entries is append-only: % on sequence % is not permitted', TG_OP, OLD.sequence;
end;
$$;

drop trigger if exists a2a_audit_entries_append_only on public.a2a_audit_entries;
create trigger a2a_audit_entries_append_only
    before update or delete on public.a2a_audit_entries
    for each row execute function public.a2a_audit_reject_mutation();

alter table public.a2a_audit_entries enable row level security;
alter table public.a2a_audit_entries force row level security;

drop policy if exists a2a_audit_select on public.a2a_audit_entries;
create policy a2a_audit_select on public.a2a_audit_entries
    for select to authenticated
    using (public.member_role(organization_id) is not null);

drop policy if exists a2a_audit_insert on public.a2a_audit_entries;
create policy a2a_audit_insert on public.a2a_audit_entries
    for insert to authenticated
    with check (public.member_role(organization_id) is not null);

grant select, insert on public.a2a_audit_entries to authenticated;
grant select, insert on public.a2a_audit_entries to service_role;

commit;