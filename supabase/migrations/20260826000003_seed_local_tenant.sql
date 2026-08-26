-- ============================================================================
-- 20260826000003_seed_local_tenant.sql
-- The Blueprint - local development tenant seed.
--
-- Guarded, idempotent (ON CONFLICT DO NOTHING). The org-scoped rows (org,
-- subscription, entitlement, project, invitation) are written unconditionally.
-- The demo user identity + per-user rows are written only against a local
-- auth bootstrap (plain Postgres / local dev). On a hosted Supabase project the
-- demo user must be provisioned through Supabase Auth (the profiles trigger
-- then creates the profile row), so the user-dependent section is skipped with
-- a NOTICE instead of failing the migration.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Tenant-owned data (no auth dependency)
-- ---------------------------------------------------------------------------
-- Local dev organization: the tenant root.
insert into public.organizations (id, name, slug, workspace_type, created_by)
values (
    '22222222-2222-4222-8222-222222222222',
    'Carter Athletics',
    'carter-athletics-demo',
    'athlete_studio',
    null
)
on conflict (slug) do nothing;

-- Subscription mirror (demo / starter).
insert into public.subscriptions (
    id, organization_id, stripe_customer_id, stripe_subscription_id,
    stripe_price_id, status, current_period_start, current_period_end
)
select
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-4222-8222-222222222222',
    'cus_demo',
    'sub_demo',
    'price_starter',
    'active',
    now(),
    now() + interval '30 days'
where not exists (select 1 from public.subscriptions where stripe_customer_id = 'cus_demo');

-- Entitlements: starter plan, 100 AI credits/mo.
insert into public.entitlements (
    id, organization_id, plan, seats_limit, ai_credits_monthly, ai_credits_used, modules
)
values (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'starter', 3, 100, 5, '{"studio":true,"content":true,"media":true}'::jsonb
)
on conflict (organization_id) do nothing;

-- Sample project.
insert into public.projects (id, organization_id, name, slug, status, metadata)
values (
    '55555555-5555-4555-8555-555555555555',
    '22222222-2222-4222-8222-222222222222',
    'Fall Campaign', 'fall-campaign', 'active',
    '{"kind":"campaign","deliverables":3}'::jsonb
)
on conflict (organization_id, slug) do nothing;

-- Invitation (invited_by backfilled once the demo identity exists below).
insert into public.invitations (
    id, organization_id, email, role, token_hash, status, expires_at, invited_by
)
values (
    '66666666-6666-4666-8666-666666666666',
    '22222222-2222-4222-8222-222222222222',
    'creator@carterathletics.com', 'member', 'invite-demo', 'pending',
    now() + interval '7 days', null
)
on conflict (organization_id, email) do nothing;

-- ---------------------------------------------------------------------------
-- User identity + per-user tenant rows (local dev only)
-- ---------------------------------------------------------------------------
do $$
declare
    is_supabase_auth boolean := exists (
        select 1 from information_schema.columns
        where table_schema = 'auth' and table_name = 'users' and column_name = 'instance_id'
    );
begin
    if is_supabase_auth then
        raise notice 'Seed: hosted Supabase auth detected - create the demo user via Supabase Auth UI so the profiles trigger provisions jordan.carter@state.edu.';
        return;
    end if;

    -- local (plain Postgres bootstrap) auth identity
    insert into auth.users (id, email, raw_user_meta_data)
    values ('11111111-1111-4111-8111-111111111111', 'jordan.carter@example.edu', '{"full_name":"Jordan Carter"}'::jsonb)
    on conflict (id) do nothing;

    insert into public.profiles (user_id, full_name, role)
    values ('11111111-1111-4111-8111-111111111111', 'Jordan Carter', 'athlete')
    on conflict (user_id) do nothing;

    -- the demo owner owns the tenant
    insert into public.organization_members (organization_id, user_id, role)
    values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'owner')
    on conflict (organization_id, user_id) do nothing;

    update public.invitations
       set invited_by = '11111111-1111-4111-8111-111111111111'
     where token_hash = 'invite-demo' and invited_by is null;

    update public.projects
       set owner_user_id = '11111111-1111-4111-8111-111111111111'
     where id = '55555555-5555-4555-8555-555555555555'
       and owner_user_id is null;

        insert into public.usage_events (organization_id, user_id, event_type, quantity, metadata)
    select '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'ai_credit_consumed', 1, '{"aiRunKind":"draft"}'::jsonb
    where not exists (
      select 1 from public.usage_events
      where organization_id = '22222222-2222-4222-8222-222222222222'
        and user_id = '11111111-1111-4111-8111-111111111111'
        and event_type = 'ai_credit_consumed'
    );

    insert into public.ai_runs (organization_id, user_id, status, kind, model, input_tokens, output_tokens, cost)
    select '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'succeeded', 'draft', 'gpt-4o', 1200, 300, 0.012
    where not exists (
      select 1 from public.ai_runs
      where organization_id = '22222222-2222-4222-8222-222222222222'
        and user_id = '11111111-1111-4111-8111-111111111111'
        and kind = 'draft'
    );

    insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
    select '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'organization.created', 'organization', '22222222-2222-4222-8222-222222222222', '{"details":"Created Carter Athletics demo tenant"}'::jsonb
    where not exists (
      select 1 from public.audit_events
      where organization_id = '22222222-2222-4222-8222-222222222222'
        and action = 'organization.created'
    );

    raise notice 'Seed: local development tenant Carter Athletics provisioned.';
end $$;

commit;