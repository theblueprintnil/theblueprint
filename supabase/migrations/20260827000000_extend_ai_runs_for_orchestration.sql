-- ============================================================================
-- 20260827000000_extend_ai_runs_for_orchestration.sql
-- The Blueprint - Phase 4: AI service layer.
-- Extends ai_runs with feature_key, prompt_template_version, policy snapshot,
-- source citations, and human-review/approval fields for NIL compliance.
-- ============================================================================

begin;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'ai_approval_status') then
        create type public.ai_approval_status as enum ('not_required', 'pending_review', 'approved', 'rejected');
    end if;
end $$;

alter table public.ai_runs
    add column if not exists feature_key            text,
    add column if not exists prompt_template_version text,
    add column if not exists policy_snapshot_id     text,
    add column if not exists source_citations       jsonb,
    add column if not exists review_required        boolean not null default false,
    add column if not exists reviewer_id            uuid references public.profiles (user_id) on delete set null,
    add column if not exists approval_status        public.ai_approval_status not null default 'not_required';

create index if not exists ai_runs_org_feature_created_idx
    on public.ai_runs (organization_id, feature_key, created_at desc);

create index if not exists ai_runs_review_idx
    on public.ai_runs (review_required, approval_status)
    where review_required = true;

-- Reviewer updates are restricted to owners/admins (same as ai_runs_update).
drop policy if exists ai_runs_review_update on public.ai_runs;
create policy ai_runs_review_update on public.ai_runs
    for update to authenticated
    using (public.member_role(organization_id) in ('owner', 'admin'))
    with check (public.member_role(organization_id) in ('owner', 'admin'));

commit;
