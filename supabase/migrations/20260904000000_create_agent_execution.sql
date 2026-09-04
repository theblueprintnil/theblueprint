begin;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'agent_graph_kind') then
        create type public.agent_graph_kind as enum ('nil_generation');
    end if;
    if not exists (select 1 from pg_type where typname = 'agent_execution_status') then
        create type public.agent_execution_status as enum ('queued', 'running', 'pending_approval', 'approved', 'revision_requested', 'published', 'failed');
    end if;
    if not exists (select 1 from pg_type where typname = 'risk_severity') then
        create type public.risk_severity as enum ('low', 'medium', 'high', 'critical');
    end if;
end $$;

create table if not exists public.agent_task_executions (
    id                 uuid primary key default gen_random_uuid(),
    organization_id    uuid not null references public.organizations (id) on delete cascade,
    athlete_id         uuid not null references public.athletes (id) on delete cascade,
    graph_kind         public.agent_graph_kind not null default 'nil_generation',
    thread_id          text not null,
    status             public.agent_execution_status not null default 'queued',
    compliance_score   double precision check (compliance_score >= 0 and compliance_score <= 1),
    compliance_flags   jsonb,
    captions           jsonb,
    input_ref          jsonb,
    reviewer_id        uuid references public.profiles (user_id) on delete set null,
    reviewer_feedback  text,
    published_post_url text,
    error_message      text,
    started_at         timestamptz,
    completed_at       timestamptz,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create unique index if not exists agent_task_org_thread_idx
    on public.agent_task_executions (organization_id, thread_id);

create index if not exists agent_task_org_status_idx
    on public.agent_task_executions (organization_id, status);

create index if not exists agent_task_org_created_idx
    on public.agent_task_executions (organization_id, created_at desc);

alter table public.agent_task_executions enable row level security;

drop policy if exists agent_task_select on public.agent_task_executions;
create policy agent_task_select on public.agent_task_executions
    for select to authenticated
    using (public.member_role(organization_id) is not null);

drop policy if exists agent_task_insert on public.agent_task_executions;
create policy agent_task_insert on public.agent_task_executions
    for insert to authenticated
    with check (public.member_role(organization_id) is not null);

drop policy if exists agent_task_review_update on public.agent_task_executions;
create policy agent_task_review_update on public.agent_task_executions
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

commit;