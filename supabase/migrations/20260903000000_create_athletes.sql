begin;

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

alter table public.athletes enable row level security;
alter table public.athletes force row level security;

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

grant select, insert, update, delete on public.athletes to authenticated;
grant select, insert, update, delete on public.athletes to service_role;

commit;
