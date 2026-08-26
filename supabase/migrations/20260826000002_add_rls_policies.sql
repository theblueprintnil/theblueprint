-- ============================================================================
-- 20260826000002_add_rls_policies.sql
-- The Blueprint - Phase 2 secure multi-tenant database foundation.
-- Part 3/3: Row-Level Security enablement and all per-table policies.
--
-- Identity model:
--   * A request is identified by the JWTs `sub` claim surfaced by auth.uid().
--   * A user is a tenant member IFF a public.organization_members row exists
--     for (auth.uid(), target organization).
--   * member_role(org) drives least-privilege authorization.
-- Append-only tables (usage_events, audit_events) expose no UPDATE/DELETE
-- policies to the app roles; privileged system operations use service_role.
--
-- Roles referenced (standard Supabase): anon, authenticated, service_role.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Tenant membership helpers
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Privileges (Supabase roles)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
grant usage on schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enable + force RLS on every tenant-owned table
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.organizations       enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations         enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.entitlements        enable row level security;
alter table public.usage_events        enable row level security;
alter table public.ai_runs             enable row level security;
alter table public.audit_events        enable row level security;
alter table public.projects            enable row level security;

alter table public.profiles            force row level security;
alter table public.organizations       force row level security;
alter table public.organization_members force row level security;
alter table public.invitations         force row level security;
alter table public.subscriptions       force row level security;
alter table public.entitlements        force row level security;
alter table public.usage_events        force row level security;
alter table public.ai_runs             force row level security;
alter table public.audit_events        force row level security;
alter table public.projects            force row level security;
-- ---------------------------------------------------------------------------
-- profiles: a user may only access their own profile
-- ---------------------------------------------------------------------------
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- organizations: members may read; any authenticated user may create (as owner)
-- ---------------------------------------------------------------------------
drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations
    for select to authenticated
    using (public.is_member(id));

drop policy if exists organizations_create on public.organizations;
create policy organizations_create on public.organizations
    for insert to authenticated
    with check (auth.uid() = created_by);

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
    for update to authenticated
    using (public.member_role(id) = 'owner')
    with check (public.member_role(id) = 'owner');

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
    for delete to authenticated
    using (public.member_role(id) = 'owner');

-- ---------------------------------------------------------------------------
-- organization_members: membership is a write-scoped resource. owners/admins
-- manage; any member may view the roster; members/viewers may not self-elevate.
-- ---------------------------------------------------------------------------
drop policy if exists organization_members_read on public.organization_members;
create policy organization_members_read on public.organization_members
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists organization_members_insert on public.organization_members;
create policy organization_members_insert on public.organization_members
    for insert to authenticated
    with check (public.member_role(organization_id) in ('owner', 'admin'));

drop policy if exists organization_members_update on public.organization_members;
create policy organization_members_update on public.organization_members
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

drop policy if exists organization_members_delete on public.organization_members;
create policy organization_members_delete on public.organization_members
    for delete to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- invitations: owners/admins manage; members may read
-- ---------------------------------------------------------------------------
drop policy if exists invitations_read on public.invitations;
create policy invitations_read on public.invitations
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
    for insert to authenticated
    with check (public.member_role(organization_id) in ('owner', 'admin'));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
    for delete to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'));
-- ---------------------------------------------------------------------------
-- subscriptions: members may view plan state; owners/admins and service_role
-- mutate (Stripe webhooks run under service_role per product non-negotiable).
-- ---------------------------------------------------------------------------
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists subscriptions_manage on public.subscriptions;
create policy subscriptions_manage on public.subscriptions
    for all to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- entitlements: selected by members, managed by owners/admins + service_role.
-- Soft-update only from within the app; no end-user elevation.
-- ---------------------------------------------------------------------------
drop policy if exists entitlements_read on public.entitlements;
create policy entitlements_read on public.entitlements
    for select to authenticated
    using (public.is_member(organization_id));

drop policy if exists entitlements_manage on public.entitlements;
create policy entitlements_manage on public.entitlements
    for all to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- usage_events: append-only ledger. Members may insert (metered actions) and
-- read their org's history. No UPDATE/DELETE policy for app roles.
-- ---------------------------------------------------------------------------
drop policy if exists usage_events_insert on public.usage_events;
create policy usage_events_insert on public.usage_events
    for insert to authenticated
    with check (public.is_member(organization_id));

drop policy if exists usage_events_read on public.usage_events;
create policy usage_events_read on public.usage_events
    for select to authenticated
    using (public.is_member(organization_id));

-- ---------------------------------------------------------------------------
-- ai_runs: members create and read; owners/admins may update lifecycle status.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- audit_events: append-only security log. INSERT + SELECT for members;
-- UPDATE/DELETE intentionally NOT granted to app roles. Only service_role can
-- perform privileged system operations against the log.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- projects: members read + create; owners/admins update + delete
-- ---------------------------------------------------------------------------
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

commit;