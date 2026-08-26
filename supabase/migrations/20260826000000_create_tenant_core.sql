-- ============================================================================
-- 20260826000000_create_tenant_core.sql
-- The Blueprint - Phase 2 secure multi-tenant database foundation.
-- Part 1/3: enums, shared helpers, profiles, organizations, organization_members.
-- RLS and policies are added in migration 20260826000002_add_rls_policies.sql.
-- ============================================================================

begin;

-- Enums
do $$
begin
    if not exists (select 1 from pg_type where typname = 'membership_role') then
        create type public.membership_role as enum ('owner', 'admin', 'member', 'viewer');
    end if;
    if not exists (select 1 from pg_type where typname = 'invitation_status') then
        create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
    end if;
end $$;

-- shared updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- profiles: one row per authenticated Supabase user (linked to auth.users)
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

-- auto-provision a profile when a user signs up through Supabase Auth
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
-- organizations: the tenant root (only tenant-owned table with no org_id)
create table if not exists public.organizations (
    id             uuid primary key default gen_random_uuid(),
    name           text not null,
    slug           text not null unique,
    workspace_type text not null default 'athlete_studio',
    created_by     uuid references public.profiles (user_id) on delete set null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists organizations_created_by_idx on public.organizations (created_by);
create index if not exists organizations_created_at_idx on public.organizations (created_at desc);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
    before update on public.organizations
    for each row execute function public.set_updated_at();

-- organization_members: the tenant-isolation join; RLS keys off these rows
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

-- an organization must always retain at least one owner.
-- The guard fires on owner removal/demotion over interactive RLS paths, but
-- honors a session flag (app.bulk_teardown='on') so privileged/system flows
-- (e.g. deleting the organization itself) are not blocked by the FK cascade.
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

commit;