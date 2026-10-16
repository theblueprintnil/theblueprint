-- ============================================================================
-- 20261009194021_init_nil_blueprint_schema.sql
-- The Blueprint - Consolidated NIL Operating Platform Database Schema
--
-- Includes:
-- 1. Extensions, Types & Enums
-- 2. Core Tenant & Identity (profiles, organizations, organization_members, invitations)
-- 3. NIL Domain Entities (athletes, guardian_links, guardian_consents, brands, opportunities, deals)
-- 4. Agent Orchestration & Execution (agent_registrations, agent_keys, agent_task_executions, ai_runs)
-- 5. Audit, Policy & Verification (policy_packs, edit_deltas, a2a_audit_entries, audit_events)
-- 6. Billing & Metering (subscriptions, entitlements, usage_events, projects)
-- 7. Triggers, Security Definer Helpers & Row-Level Security Policies
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Extensions & Custom Types / Enums
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

do $$
begin
    if not exists (select 1 from pg_type where typname = 'membership_role') then
        create type public.membership_role as enum ('owner', 'admin', 'member', 'viewer');
    end if;

    if not exists (select 1 from pg_type where typname = 'invitation_status') then
        create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
    end if;

    if not exists (select 1 from pg_type where typname = 'billing_status') then
        create type public.billing_status as enum ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');
    end if;

    if not exists (select 1 from pg_type where typname = 'plan_type') then
        create type public.plan_type as enum ('demo', 'starter', 'growth', 'premium');
    end if;

    if not exists (select 1 from pg_type where typname = 'project_status') then
        create type public.project_status as enum ('active', 'archived');
    end if;

    if not exists (select 1 from pg_type where typname = 'ai_run_status') then
        create type public.ai_run_status as enum ('pending', 'running', 'succeeded', 'failed');
    end if;

    if not exists (select 1 from pg_type where typname = 'ai_approval_status') then
        create type public.ai_approval_status as enum ('not_required', 'pending_review', 'approved', 'rejected');
    end if;

    if not exists (select 1 from pg_type where typname = 'agent_graph_kind') then
        create type public.agent_graph_kind as enum ('nil_generation');
    end if;

    if not exists (select 1 from pg_type where typname = 'agent_execution_status') then
        create type public.agent_execution_status as enum (
            'queued',
            'running',
            'pending_approval',
            'approved',
            'revision_requested',
            'published',
            'failed',
            'cancelled',
            'expired',
            'input_required'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'risk_severity') then
        create type public.risk_severity as enum ('low', 'medium', 'high', 'critical');
    end if;

    if not exists (select 1 from pg_type where typname = 'deal_status') then
        create type public.deal_status as enum ('draft', 'pending', 'active', 'completed', 'cancelled');
    end if;

    if not exists (select 1 from pg_type where typname = 'opportunity_status') then
        create type public.opportunity_status as enum ('open', 'applied', 'accepted', 'closed');
    end if;
end $$;

-- Shared timestamp trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Core Identity & Organization Tables
-- ---------------------------------------------------------------------------

-- profiles: one row per authenticated user
create table if not exists public.profiles (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    full_name  text not null,
    role       text not null default 'athlete',
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

-- auto-provision profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
    insert into public.profiles (user_id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'))
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- organizations: tenant root
create table if not exists public.organizations (
    id                            uuid primary key default gen_random_uuid(),
    name                          text not null,
    slug                          text not null unique,
    workspace_type                text not null default 'athlete_studio',
    autonomy_threshold_minor_units integer not null default 25000,
    autonomy_kill_switch          boolean not null default false,
    created_by                    uuid references public.profiles (user_id) on delete set null,
    demo_expires_at               timestamptz,
    created_at                    timestamptz not null default now(),
    updated_at                    timestamptz not null default now()
);

create index if not exists organizations_created_by_idx on public.organizations (created_by);
create index if not exists organizations_created_at_idx on public.organizations (created_at desc);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
    before update on public.organizations
    for each row execute function public.set_updated_at();

-- organization_members: tenant membership association
create table if not exists public.organization_members (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id         uuid not null references public.profiles (user_id) on delete cascade,
    role            public.membership_role not null default 'member',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint organization_members_unique unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists organization_members_org_idx on public.organization_members (organization_id);

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
    before update on public.organization_members
    for each row execute function public.set_updated_at();

-- prevent removing last owner
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
    org_id  uuid;
    n_owner int;
begin
    if coalesce(current_setting('app.bulk_teardown', true), '') = 'on' then
        if tg_op = 'DELETE' then
            return old;
        end if;
        return new;
    end if;
    org_id := coalesce(old.organization_id, new.organization_id);
    if (tg_op = 'DELETE' and old.role = 'owner')
       or (tg_op = 'UPDATE' and old.role = 'owner' and new.role is distinct from 'owner') then
        select count(*)
          into n_owner
          from public.organization_members
         where organization_id = org_id
           and role = 'owner'
           and id is distinct from old.id;
        if n_owner = 0 then
            raise exception 'cannot remove the last owner of organization %', org_id;
        end if;
    end if;
    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

drop trigger if exists trigger_prevent_last_owner_removal on public.organization_members;
create trigger trigger_prevent_last_owner_removal
    before delete or update of role on public.organization_members
    for each row execute function public.prevent_last_owner_removal();

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

-- ---------------------------------------------------------------------------
-- 3. NIL Domain Entities
-- ---------------------------------------------------------------------------

-- athletes
create table if not exists public.athletes (
    id                    uuid primary key default gen_random_uuid(),
    user_id               uuid not null unique references public.profiles (user_id) on delete cascade,
    name                  text not null,
    sport                 text not null,
    school                text not null,
    bio                   text,
    avatar_url            text,
    follower_count        integer not null default 0,
    verification_status   text not null default 'verified',
    date_of_birth         date,
    age_tier_verified_at  timestamptz,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index if not exists athletes_user_idx on public.athletes (user_id);

drop trigger if exists athletes_set_updated_at on public.athletes;
create trigger athletes_set_updated_at
    before update on public.athletes
    for each row execute function public.set_updated_at();

-- guardian_links
create table if not exists public.guardian_links (
    id                uuid primary key default gen_random_uuid(),
    organization_id   uuid not null references public.organizations (id) on delete cascade,
    athlete_id        uuid not null references public.athletes (id) on delete cascade,
    guardian_user_id  uuid not null references public.profiles (user_id) on delete cascade,
    relationship      text not null,
    verification      text not null,
    effective_from    timestamptz not null default now(),
    revoked_at        timestamptz,
    created_at        timestamptz not null default now(),
    constraint guardian_links_athlete_guardian_unique unique (athlete_id, guardian_user_id)
);

create index if not exists guardian_links_org_idx on public.guardian_links (organization_id);
create index if not exists guardian_links_guardian_idx on public.guardian_links (guardian_user_id);

-- guardian_consents
create table if not exists public.guardian_consents (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references public.organizations (id) on delete cascade,
    guardian_link_id    uuid not null references public.guardian_links (id) on delete cascade,
    scope               text not null,
    granted_by_user_id  uuid not null references public.profiles (user_id) on delete cascade,
    granted_at          timestamptz not null default now(),
    revoked_at          timestamptz,
    payload             jsonb
);

create index if not exists guardian_consents_org_idx on public.guardian_consents (organization_id);
create index if not exists guardian_consents_link_idx on public.guardian_consents (guardian_link_id);

-- brands
create table if not exists public.brands (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null unique references public.profiles (user_id) on delete cascade,
    name        text not null,
    industry    text not null,
    logo_url    text,
    verified    boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists brands_user_idx on public.brands (user_id);

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
    before update on public.brands
    for each row execute function public.set_updated_at();

-- opportunities
create table if not exists public.opportunities (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations (id) on delete set null,
    owner_user_id   uuid references public.profiles (user_id) on delete cascade,
    title           text not null,
    brand_name      text not null,
    payout          numeric(12, 2) not null,
    sport           text not null,
    location        text not null,
    deadline        text not null,
    status          public.opportunity_status not null default 'open',
    description     text not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists opportunities_org_idx on public.opportunities (organization_id);
create index if not exists opportunities_owner_idx on public.opportunities (owner_user_id);

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
    before update on public.opportunities
    for each row execute function public.set_updated_at();

-- deals
create table if not exists public.deals (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations (id) on delete set null,
    owner_user_id   uuid references public.profiles (user_id) on delete cascade,
    title           text not null,
    brand_name      text not null,
    athlete_name    text not null,
    amount          numeric(12, 2) not null,
    amount_minor_units integer not null default 0,
    status          public.deal_status not null default 'active',
    stage           text not null,
    deliverables    integer not null default 1,
    start_date      text not null,
    end_date        text not null,
    approval_required boolean not null default false,
    approved_by     uuid references public.profiles (user_id) on delete set null,
    approved_at     timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists deals_org_idx on public.deals (organization_id);
create index if not exists deals_owner_idx on public.deals (owner_user_id);

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
    before update on public.deals
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Agent Orchestration & Execution Layer
-- ---------------------------------------------------------------------------

-- agent_registrations
create table if not exists public.agent_registrations (
    id         uuid primary key default gen_random_uuid(),
    agent_id   text not null unique,
    name       text not null,
    publisher  text not null,
    org_id     uuid references public.organizations (id) on delete cascade,
    scopes     jsonb not null default '[]'::jsonb,
    min_tier   text not null default 'T3_SELF_SERVE',
    max_depth  integer not null default 2,
    status     text not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists agent_registrations_org_idx on public.agent_registrations (org_id);

drop trigger if exists agent_registrations_set_updated_at on public.agent_registrations;
create trigger agent_registrations_set_updated_at
    before update on public.agent_registrations
    for each row execute function public.set_updated_at();

-- agent_keys
create table if not exists public.agent_keys (
    id             uuid primary key default gen_random_uuid(),
    agent_id       text not null,
    kid            text not null unique,
    algorithm      text not null default 'RS256',
    public_key_pem text not null,
    not_before     timestamptz not null default now(),
    not_after      timestamptz,
    revoked_at     timestamptz,
    created_at     timestamptz not null default now()
);

create index if not exists agent_keys_agent_idx on public.agent_keys (agent_id);

-- agent_task_executions
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
    a2a_task_id        text,
    trace_id           text,
    parent_task_id     text,
    depth              integer not null default 0,
    cost_minor_units   integer not null default 0,
    age_tier           text,
    policy_snapshot_id text,
    cosign_state       text,
    expires_at         timestamptz,
    cancelled_at       timestamptz,
    audit_sequence     bigint,
    started_at         timestamptz,
    completed_at       timestamptz,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create unique index if not exists agent_task_org_thread_idx
    on public.agent_task_executions (organization_id, thread_id);
create unique index if not exists agent_task_a2a_task_id_key
    on public.agent_task_executions (a2a_task_id)
    where a2a_task_id is not null;
create index if not exists agent_task_org_status_idx
    on public.agent_task_executions (organization_id, status);
create index if not exists agent_task_org_created_idx
    on public.agent_task_executions (organization_id, created_at desc);

drop trigger if exists agent_task_executions_set_updated_at on public.agent_task_executions;
create trigger agent_task_executions_set_updated_at
    before update on public.agent_task_executions
    for each row execute function public.set_updated_at();

-- ai_runs
create table if not exists public.ai_runs (
    id                      uuid primary key default gen_random_uuid(),
    organization_id         uuid not null references public.organizations (id) on delete cascade,
    user_id                 uuid references public.profiles (user_id) on delete set null,
    status                  public.ai_run_status not null default 'pending',
    kind                    text,
    feature_key             text,
    model                   text not null,
    prompt_template_version text,
    policy_snapshot_id      text,
    source_citations        jsonb,
    review_required         boolean not null default false,
    reviewer_id             uuid references public.profiles (user_id) on delete set null,
    approval_status         public.ai_approval_status not null default 'not_required',
    input_ref               jsonb,
    output_ref              jsonb,
    input_tokens            int not null default 0 check (input_tokens >= 0),
    output_tokens           int not null default 0 check (output_tokens >= 0),
    cost                    numeric(10, 6) not null default 0 check (cost >= 0),
    started_at              timestamptz,
    completed_at            timestamptz,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create index if not exists ai_runs_org_created_idx on public.ai_runs (organization_id, created_at desc);
create index if not exists ai_runs_org_feature_created_idx on public.ai_runs (organization_id, feature_key, created_at desc);
create index if not exists ai_runs_user_idx on public.ai_runs (user_id);
create index if not exists ai_runs_status_idx on public.ai_runs (status);
create index if not exists ai_runs_model_idx on public.ai_runs (model);
create index if not exists ai_runs_review_idx on public.ai_runs (review_required, approval_status) where review_required = true;

drop trigger if exists ai_runs_set_updated_at on public.ai_runs;
create trigger ai_runs_set_updated_at
    before update on public.ai_runs
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Governance, Audit & Policy
-- ---------------------------------------------------------------------------

-- policy_packs
create table if not exists public.policy_packs (
    id          uuid primary key default gen_random_uuid(),
    pack_id     text not null unique,
    version     text not null,
    rules       jsonb not null,
    active      boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

drop trigger if exists policy_packs_set_updated_at on public.policy_packs;
create trigger policy_packs_set_updated_at
    before update on public.policy_packs
    for each row execute function public.set_updated_at();

-- edit_deltas
create table if not exists public.edit_deltas (
    id                 uuid primary key default gen_random_uuid(),
    organization_id    uuid not null references public.organizations (id) on delete cascade,
    task_execution_id  uuid not null references public.agent_task_executions (id) on delete cascade,
    reviewer_id        uuid references public.profiles (user_id) on delete set null,
    field              text not null,
    before_value       text,
    after_value        text,
    reason             text,
    policy_snapshot_id text,
    redacted           boolean not null default false,
    created_at         timestamptz not null default now()
);

create index if not exists edit_deltas_org_created_idx on public.edit_deltas (organization_id, created_at);
create index if not exists edit_deltas_task_idx on public.edit_deltas (task_execution_id);

-- a2a_audit_entries: cryptographic hash-chained audit ledger
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

create index if not exists a2a_audit_org_created_idx on public.a2a_audit_entries (organization_id, created_at);
create index if not exists a2a_audit_action_idx on public.a2a_audit_entries (action);

-- Append-only mutation rejection trigger
create or replace function public.a2a_audit_reject_mutation()
returns trigger
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

-- audit_events: legacy/system audit log
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

-- ---------------------------------------------------------------------------
-- 6. Billing, Usage & Workspace Artifacts
-- ---------------------------------------------------------------------------

-- subscriptions: Stripe billing mirror
create table if not exists public.subscriptions (
    id                     uuid primary key default gen_random_uuid(),
    organization_id        uuid not null unique references public.organizations (id) on delete cascade,
    stripe_customer_id     text not null unique constraint subscriptions_stripe_customer_format check (stripe_customer_id like 'cus_%'),
    stripe_subscription_id text not null unique constraint subscriptions_stripe_sub_format check (stripe_subscription_id like 'sub_%'),
    stripe_price_id        text,
    status                 public.billing_status not null default 'trialing',
    current_period_start   timestamptz,
    current_period_end     timestamptz,
    cancel_at_period_end   boolean not null default false,
    trial_end              timestamptz,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_org_idx on public.subscriptions (organization_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
    before update on public.subscriptions
    for each row execute function public.set_updated_at();

-- entitlements: plan features and limits
create table if not exists public.entitlements (
    id                 uuid primary key default gen_random_uuid(),
    organization_id    uuid not null unique references public.organizations (id) on delete cascade,
    plan_type          public.plan_type not null default 'starter',
    seats_limit        int not null default 1 check (seats_limit >= 1),
    seats_used         int not null default 1 check (seats_used >= 0),
    ai_credits_monthly int not null default 0 check (ai_credits_monthly >= 0),
    ai_credits_used    int not null default 0 check (ai_credits_used >= 0),
    modules            jsonb,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    constraint entitlements_seats_ceiling check (seats_used <= seats_limit)
);

create index if not exists entitlements_org_idx on public.entitlements (organization_id);

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
    before update on public.entitlements
    for each row execute function public.set_updated_at();

-- usage_events: append-only metering
create table if not exists public.usage_events (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id         uuid references public.profiles (user_id) on delete set null,
    event_type      text not null,
    quantity        int not null default 1 check (quantity > 0),
    external_ref    text,
    metadata        jsonb,
    created_at      timestamptz not null default now()
);

create index if not exists usage_events_org_created_idx on public.usage_events (organization_id, created_at desc);
create index if not exists usage_events_type_idx on public.usage_events (event_type);

-- projects
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

-- ---------------------------------------------------------------------------
-- 7. Security Definer Helpers & Row-Level Security Policies
-- ---------------------------------------------------------------------------

-- Membership check helpers
create or replace function public.member_role(check_org uuid)
returns public.membership_role
language sql stable security definer set search_path = public
as $$
    select m.role
    from public.organization_members m
    where m.user_id = auth.uid()
      and m.organization_id = check_org
    limit 1;
$$;

create or replace function public.is_member(check_org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (
        select 1
        from public.organization_members m
        where m.user_id = auth.uid()
          and m.organization_id = check_org
    );
$$;

-- Table Grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Enable and Force RLS
alter table public.profiles            enable row level security;
alter table public.organizations       enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations         enable row level security;
alter table public.athletes            enable row level security;
alter table public.guardian_links      enable row level security;
alter table public.guardian_consents   enable row level security;
alter table public.brands              enable row level security;
alter table public.opportunities       enable row level security;
alter table public.deals               enable row level security;
alter table public.agent_registrations enable row level security;
alter table public.agent_keys          enable row level security;
alter table public.agent_task_executions enable row level security;
alter table public.ai_runs             enable row level security;
alter table public.policy_packs        enable row level security;
alter table public.edit_deltas         enable row level security;
alter table public.a2a_audit_entries   enable row level security;
alter table public.audit_events        enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.entitlements        enable row level security;
alter table public.usage_events        enable row level security;
alter table public.projects            enable row level security;

alter table public.profiles            force row level security;
alter table public.organizations       force row level security;
alter table public.organization_members force row level security;
alter table public.invitations         force row level security;
alter table public.athletes            force row level security;
alter table public.guardian_links      force row level security;
alter table public.guardian_consents   force row level security;
alter table public.brands              force row level security;
alter table public.opportunities       force row level security;
alter table public.deals               force row level security;
alter table public.agent_registrations force row level security;
alter table public.agent_keys          force row level security;
alter table public.agent_task_executions force row level security;
alter table public.ai_runs             force row level security;
alter table public.policy_packs        force row level security;
alter table public.edit_deltas         force row level security;
alter table public.a2a_audit_entries   force row level security;
alter table public.audit_events        force row level security;
alter table public.subscriptions       force row level security;
alter table public.entitlements        force row level security;
alter table public.usage_events        force row level security;
alter table public.projects            force row level security;

-- Profiles Policies
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
    for select to authenticated
    using (
        user_id = auth.uid()
        or exists (
            select 1
            from public.organization_members om_self
            join public.organization_members om_peer
              on om_self.organization_id = om_peer.organization_id
            where om_self.user_id = auth.uid()
              and om_peer.user_id = profiles.user_id
        )
    );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
    for insert to authenticated
    with check (user_id = auth.uid());

-- Organizations Policies
drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations
    for select to authenticated
    using (public.is_member(id) or created_by = auth.uid());

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
    for insert to authenticated
    with check (created_by = auth.uid());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
    for update to authenticated
    using (public.member_role(id) in ('owner', 'admin'))
    with check (public.member_role(id) in ('owner', 'admin'));

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
    for delete to authenticated
    using (public.member_role(id) = 'owner');

-- Organization Members Policies
drop policy if exists org_members_read on public.organization_members;
create policy org_members_read on public.organization_members
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists org_members_insert on public.organization_members;
create policy org_members_insert on public.organization_members
    for insert to authenticated
    with check (
        public.member_role(organization_id) in ('owner', 'admin')
        or not exists (
            select 1 from public.organization_members m
            where m.organization_id = organization_members.organization_id
        )
    );

drop policy if exists org_members_update on public.organization_members;
create policy org_members_update on public.organization_members
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

drop policy if exists org_members_delete on public.organization_members;
create policy org_members_delete on public.organization_members
    for delete to authenticated
    using (
        public.member_role(organization_id) in ('owner', 'admin')
        or user_id = auth.uid()
    );

-- Athletes Policies
drop policy if exists athletes_select on public.athletes;
create policy athletes_select on public.athletes
    for select to authenticated
    using (
        auth.uid() = user_id
        or exists (
            select 1
              from public.organization_members om_a
              join public.organization_members om_b
                on om_a.organization_id = om_b.organization_id
             where om_a.user_id = athletes.user_id
               and om_b.user_id = auth.uid()
        )
    );

drop policy if exists athletes_insert on public.athletes;
create policy athletes_insert on public.athletes
    for insert to authenticated
    with check (auth.uid() = user_id);

drop policy if exists athletes_update on public.athletes;
create policy athletes_update on public.athletes
    for update to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists athletes_delete on public.athletes;
create policy athletes_delete on public.athletes
    for delete to authenticated
    using (auth.uid() = user_id);

-- Guardian Links Policies
drop policy if exists guardian_links_read on public.guardian_links;
create policy guardian_links_read on public.guardian_links
    for select to authenticated
    using (public.is_member(organization_id) or guardian_user_id = auth.uid());

drop policy if exists guardian_links_manage on public.guardian_links;
create policy guardian_links_manage on public.guardian_links
    for all to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

-- Guardian Consents Policies
drop policy if exists guardian_consents_read on public.guardian_consents;
create policy guardian_consents_read on public.guardian_consents
    for select to authenticated
    using (public.is_member(organization_id) or granted_by_user_id = auth.uid());

drop policy if exists guardian_consents_insert on public.guardian_consents;
create policy guardian_consents_insert on public.guardian_consents
    for insert to authenticated
    with check (public.member_role(organization_id) in ('owner', 'admin') or granted_by_user_id = auth.uid());

-- Brands Policies
drop policy if exists brands_select on public.brands;
create policy brands_select on public.brands
    for select to authenticated
    using (true);

drop policy if exists brands_manage on public.brands;
create policy brands_manage on public.brands
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Opportunities Policies
drop policy if exists opportunities_read on public.opportunities;
create policy opportunities_read on public.opportunities
    for select to authenticated
    using (organization_id is null or public.is_member(organization_id) or owner_user_id = auth.uid());

drop policy if exists opportunities_manage on public.opportunities;
create policy opportunities_manage on public.opportunities
    for all to authenticated
    using (owner_user_id = auth.uid() or (organization_id is not null and public.member_role(organization_id) in ('owner', 'admin')))
    with check (owner_user_id = auth.uid() or (organization_id is not null and public.member_role(organization_id) in ('owner', 'admin')));

-- Deals Policies
drop policy if exists deals_read on public.deals;
create policy deals_read on public.deals
    for select to authenticated
    using (organization_id is null or public.is_member(organization_id) or owner_user_id = auth.uid());

drop policy if exists deals_manage on public.deals;
create policy deals_manage on public.deals
    for all to authenticated
    using (owner_user_id = auth.uid() or (organization_id is not null and public.member_role(organization_id) in ('owner', 'admin')))
    with check (owner_user_id = auth.uid() or (organization_id is not null and public.member_role(organization_id) in ('owner', 'admin')));

-- Agent Registration & Keys Policies
drop policy if exists agent_reg_read on public.agent_registrations;
create policy agent_reg_read on public.agent_registrations
    for select to authenticated
    using (org_id is null or public.is_member(org_id));

drop policy if exists agent_reg_manage on public.agent_registrations;
create policy agent_reg_manage on public.agent_registrations
    for all to authenticated
    using (org_id is not null and public.member_role(org_id) in ('owner', 'admin'))
    with check (org_id is not null and public.member_role(org_id) in ('owner', 'admin'));

drop policy if exists agent_keys_read on public.agent_keys;
create policy agent_keys_read on public.agent_keys
    for select to authenticated
    using (true);

-- Agent Task Executions Policies
drop policy if exists agent_task_select on public.agent_task_executions;
create policy agent_task_select on public.agent_task_executions
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists agent_task_insert on public.agent_task_executions;
create policy agent_task_insert on public.agent_task_executions
    for insert to authenticated
    with check (public.is_member(organization_id));

drop policy if exists agent_task_review_update on public.agent_task_executions;
create policy agent_task_review_update on public.agent_task_executions
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

-- AI Runs Policies
drop policy if exists ai_runs_insert on public.ai_runs;
create policy ai_runs_insert on public.ai_runs
    for insert to authenticated
    with check (public.is_member(organization_id));

drop policy if exists ai_runs_read on public.ai_runs;
create policy ai_runs_read on public.ai_runs
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists ai_runs_update on public.ai_runs;
create policy ai_runs_update on public.ai_runs
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

-- Policy Packs Policies (Global Reference Data)
drop policy if exists policy_packs_read on public.policy_packs;
create policy policy_packs_read on public.policy_packs
    for select to authenticated
    using (true);

-- Edit Deltas Policies
drop policy if exists edit_deltas_read on public.edit_deltas;
create policy edit_deltas_read on public.edit_deltas
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists edit_deltas_insert on public.edit_deltas;
create policy edit_deltas_insert on public.edit_deltas
    for insert to authenticated
    with check (public.is_member(organization_id));

-- A2A Audit Entries Policies
drop policy if exists a2a_audit_select on public.a2a_audit_entries;
create policy a2a_audit_select on public.a2a_audit_entries
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists a2a_audit_insert on public.a2a_audit_entries;
create policy a2a_audit_insert on public.a2a_audit_entries
    for insert to authenticated
    with check (public.is_member(organization_id));

-- Audit Events Policies
drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert on public.audit_events
    for insert to authenticated
    with check (public.is_member(organization_id) or actor_id = auth.uid());

drop policy if exists audit_events_read on public.audit_events;
create policy audit_events_read on public.audit_events
    for select to authenticated
    using (public.is_member(organization_id) or actor_id = auth.uid());

drop policy if exists audit_events_service_all on public.audit_events;
create policy audit_events_service_all on public.audit_events
    for all to service_role
    using (true)
    with check (true);

-- Subscriptions Policies
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists subscriptions_service_all on public.subscriptions;
create policy subscriptions_service_all on public.subscriptions
    for all to service_role
    using (true)
    with check (true);

-- Entitlements Policies
drop policy if exists entitlements_read on public.entitlements;
create policy entitlements_read on public.entitlements
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists entitlements_service_all on public.entitlements;
create policy entitlements_service_all on public.entitlements
    for all to service_role
    using (true)
    with check (true);

-- Usage Events Policies
drop policy if exists usage_events_insert on public.usage_events;
create policy usage_events_insert on public.usage_events
    for insert to authenticated
    with check (public.is_member(organization_id));

drop policy if exists usage_events_read on public.usage_events;
create policy usage_events_read on public.usage_events
    for select to authenticated
    using (public.is_member(organization_id));

-- Projects Policies
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
    for insert to authenticated
    with check (public.is_member(organization_id));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin') or owner_user_id = auth.uid())
    with check (public.is_member(organization_id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
    for delete to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin') or owner_user_id = auth.uid());

-- Invitations Policies
drop policy if exists invitations_read on public.invitations;
create policy invitations_read on public.invitations
    for select to authenticated
    using (public.is_member(organization_id) or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists invitations_create on public.invitations;
create policy invitations_create on public.invitations
    for insert to authenticated
    with check (public.member_role(organization_id) in ('owner', 'admin'));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
    for update to authenticated
    using (
        public.member_role(organization_id) in ('owner', 'admin')
        or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    with check (
        public.member_role(organization_id) in ('owner', 'admin')
        or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
    for delete to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'));

commit;
