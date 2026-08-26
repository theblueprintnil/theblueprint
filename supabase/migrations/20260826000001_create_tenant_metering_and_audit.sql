-- ============================================================================
-- 20260826000001_create_tenant_metering_and_audit.sql
-- The Blueprint - Phase 2 secure multi-tenant database foundation.
-- Part 2/3: invitations, subscriptions, entitlements, usage_events, ai_runs,
-- audit_events, projects (plus remaining enums).
-- RLS and policies are added in migration 20260826000002.
-- ============================================================================

begin;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'plan_type') then
        create type public.plan_type as enum ('demo', 'starter', 'growth', 'premium');
    end if;
    if not exists (select 1 from pg_type where typname = 'billing_status') then
        create type public.billing_status as enum ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');
    end if;
    if not exists (select 1 from pg_type where typname = 'ai_run_status') then
        create type public.ai_run_status as enum ('pending', 'running', 'succeeded', 'failed');
    end if;
    if not exists (select 1 from pg_type where typname = 'project_status') then
        create type public.project_status as enum ('active', 'archived');
    end if;
end $$;

-- invitations
create table if not exists public.invitations (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    email           text not null,
    role            public.membership_role not null default 'member',
    token_hash      text not null unique,
    status          public.invitation_status not null default 'pending',
    invited_by      uuid references public.profiles (user_id) on delete set null,
    expires_at      timestamptz,
    accepted_at     timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint invitations_org_email_unique unique (organization_id, email)
);

create index if not exists invitations_org_idx on public.invitations (organization_id);
create index if not exists invitations_email_idx on public.invitations (email);
create index if not exists invitations_token_idx on public.invitations (token_hash);

drop trigger if exists invitations_set_updated_at on public.invitations;
create trigger invitations_set_updated_at
    before update on public.invitations
    for each row execute function public.set_updated_at();

-- subscriptions: Stripe billing mirror (reconciled by Stripe webhooks)
create table if not exists public.subscriptions (
    id                   uuid primary key default gen_random_uuid(),
    organization_id      uuid not null unique references public.organizations (id) on delete cascade,
    stripe_customer_id   text not null unique constraint subscriptions_stripe_customer_format check (stripe_customer_id like 'cus_%'),
    stripe_subscription_id text not null unique constraint subscriptions_stripe_sub_format check (stripe_subscription_id like 'sub_%'),
    stripe_price_id      text,
    status               public.billing_status not null default 'trialing',
    current_period_start timestamptz,
    current_period_end   timestamptz,
    cancel_at_period_end boolean not null default false,
    trial_end            timestamptz,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_org_idx on public.subscriptions (organization_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
    before update on public.subscriptions
    for each row execute function public.set_updated_at();
-- entitlements: plan limits and metering window per organization
create table if not exists public.entitlements (
    id                 uuid primary key default gen_random_uuid(),
    organization_id    uuid not null unique references public.organizations (id) on delete cascade,
    plan               public.plan_type not null default 'demo',
    seats_limit        int not null default 1 check (seats_limit >= 1),
    ai_credits_monthly int not null default 0 check (ai_credits_monthly >= 0),
    ai_credits_used    int not null default 0 check (ai_credits_used >= 0),
    modules            jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists entitlements_org_idx on public.entitlements (organization_id);

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
    before update on public.entitlements
    for each row execute function public.set_updated_at();

-- usage_events: immutable metering ledger (append-only, no updated_at)
create table if not exists public.usage_events (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id         uuid not null references public.profiles (user_id) on delete set null,
    event_type      text not null,
    quantity        int not null default 1 check (quantity > 0),
    external_ref    text,
    metadata        jsonb,
    created_at      timestamptz not null default now()
);

create index if not exists usage_events_org_created_idx on public.usage_events (organization_id, created_at desc);
create index if not exists usage_events_user_idx on public.usage_events (user_id);
create index if not exists usage_events_type_idx on public.usage_events (event_type);

-- ai_runs: audit-ability of every AI invocation
create table if not exists public.ai_runs (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id         uuid references public.profiles (user_id) on delete set null,
    status          public.ai_run_status not null default 'pending',
    kind            text,
    model           text not null,
    input_ref       jsonb,
    output_ref      jsonb,
    input_tokens    int not null default 0 check (input_tokens >= 0),
    output_tokens   int not null default 0 check (output_tokens >= 0),
    cost            numeric(10, 6) not null default 0 check (cost >= 0),
    started_at      timestamptz,
    completed_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists ai_runs_org_created_idx on public.ai_runs (organization_id, created_at desc);
create index if not exists ai_runs_user_idx on public.ai_runs (user_id);
create index if not exists ai_runs_status_idx on public.ai_runs (status);
create index if not exists ai_runs_model_idx on public.ai_runs (model);

drop trigger if exists ai_runs_set_updated_at on public.ai_runs;
create trigger ai_runs_set_updated_at
    before update on public.ai_runs
    for each row execute function public.set_updated_at();

-- audit_events: append-only security log; mutations via service role only
create table if not exists public.audit_events (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations (id) on delete cascade,
    actor_id        uuid references public.profiles (user_id) on delete set null,
    action          text not null,
    entity_type     text,
    entity_id       uuid,
    metadata        jsonb,
    ip_address      inet,
    created_at      timestamptz not null default now()
);

create index if not exists audit_events_org_created_idx on public.audit_events (organization_id, created_at desc);
create index if not exists audit_events_actor_idx on public.audit_events (actor_id);
create index if not exists audit_events_action_idx on public.audit_events (action);
create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id);

-- projects: a tenant workspace artifact
create table if not exists public.projects (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    name            text not null,
    slug            text not null,
    status          public.project_status not null default 'active',
    owner_user_id   uuid references public.profiles (user_id) on delete set null,
    metadata        jsonb,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint projects_org_slug_unique unique (organization_id, slug)
);

create index if not exists projects_org_idx on public.projects (organization_id);
create index if not exists projects_owner_idx on public.projects (owner_user_id);
create index if not exists projects_status_idx on public.projects (status);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
    before update on public.projects
    for each row execute function public.set_updated_at();

commit;