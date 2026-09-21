-- ============================================================================
-- tenant_isolation.sql — automated tenant-isolation tests
--
-- Verifies: "User A in Org A must never read or mutate Org B data", plus
-- role least-privilege and the append-only audit_events log.
--
-- Runs against plain Postgres (local docker) after bootstrap_local_auth.sql and
-- the canonical migrations. Any violation fails the script under
-- psql -v ON_ERROR_STOP=1; a green run prints PASS lines.
--
-- Authentication is simulated per transaction:
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims TO '<json>';  -> auth.uid()/member_role()
-- ============================================================================

\set ON_ERROR_STOP on

-- System flow: allow full tenant teardown during fixture setup (matches how a
-- privileged/system operation deletes an organization; interactive RLS still
-- prevents end-users from removing the last owner without this flag).
SET app.bulk_teardown = 'on';

-- ---------------------------------------------------------------------------
-- Fixtures (privileged role bypasses RLS)
-- ---------------------------------------------------------------------------
DELETE FROM organizations WHERE slug IN ('org-a-demo','org-b-demo');
DELETE FROM auth.users    WHERE id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc');

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rls-a@test.local','{"full_name":"User A"}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rls-b@test.local','{"full_name":"User B"}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','rls-c@test.local','{"full_name":"User C"}');

INSERT INTO public.organizations (id, name, slug, created_by) VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000a','Org A','org-a-demo','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('aaaaaaaa-0000-4000-8000-00000000000b','Org B','org-b-demo','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000a','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000b','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000a','cccccccc-cccc-4ccc-8ccc-cccccccccccc','viewer');

INSERT INTO public.projects (id, organization_id, name, slug) VALUES
  ('eeeeeeee-0000-4000-8000-00000000000a','aaaaaaaa-0000-4000-8000-00000000000a','Project A','project-a'),
  ('eeeeeeee-0000-4000-8000-00000000000b','aaaaaaaa-0000-4000-8000-00000000000b','Project B','project-b');

INSERT INTO public.audit_events (organization_id, actor_id, action, entity_type, entity_id) VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000a','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','project_created','project','eeeeeeee-0000-4000-8000-00000000000a');

-- Fixtures complete; clear the system flag so isolation checks run unlocked.
RESET app.bulk_teardown;

-- ---------------------------------------------------------------------------
-- (1) user A sees only its own tenant rows
-- (2) cannot read Org B row by id
-- (3) cannot insert into Org B
-- (4) cannot update/delete Org B
-- ---------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"iss":"supabase","role":"authenticated","sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';

DO $$
DECLARE n_total int; n_a int;
BEGIN
  SELECT count(*) INTO n_total FROM public.projects;
  SELECT count(*) INTO n_a     FROM public.projects WHERE organization_id='aaaaaaaa-0000-4000-8000-00000000000a';
  IF n_total <> n_a THEN
    RAISE EXCEPTION 'ISOLATION FAIL: user A sees % projects but only % belong to Org A', n_total, n_a;
  END IF;
  RAISE NOTICE 'PASS    [1] A sees only own tenant rows (projects A=%, all=%)', n_a, n_total;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.projects WHERE id='eeeeeeee-0000-4000-8000-00000000000b';
  IF n <> 0 THEN RAISE EXCEPTION 'ISOLATION FAIL: user A read Org B project by id (rows=%)', n; END IF;
  RAISE NOTICE 'PASS    [2] A cannot read Org B row by id';
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.projects (organization_id,name,slug)
    VALUES ('aaaaaaaa-0000-4000-8000-00000000000b','forged','forged');
    RAISE EXCEPTION 'ISOLATION FAIL: user A inserted into Org B';
  EXCEPTION WHEN sqlstate '42501' THEN
    RAISE NOTICE 'PASS    [3] A cannot insert into Org B (denied by RLS)';
  END;
END $$;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.projects SET name='tampered' WHERE id='eeeeeeee-0000-4000-8000-00000000000b';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'ISOLATION FAIL: user A updated Org B row (rows=%)', n; END IF;

  DELETE FROM public.projects WHERE id='eeeeeeee-0000-4000-8000-00000000000b';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'ISOLATION FAIL: user A deleted Org B row (rows=%)', n; END IF;

  RAISE NOTICE 'PASS    [4] A cannot update/delete Org B rows';
END $$;

ROLLBACK;
-- ---------------------------------------------------------------------------
-- (5) least privilege: a viewer cannot elevate their role or create invites
-- ---------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"iss":"supabase","role":"authenticated","sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.organization_members (organization_id,user_id,role)
    VALUES ('aaaaaaaa-0000-4000-8000-00000000000a','cccccccc-cccc-4ccc-8ccc-cccccccccccc','owner')
    ON CONFLICT (organization_id,user_id) DO UPDATE SET role='owner';
    RAISE EXCEPTION 'FAIL: viewer elevated own role to owner';
  EXCEPTION WHEN sqlstate '42501' THEN
    RAISE NOTICE 'PASS    [5] viewer cannot elevate own role';
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.invitations (organization_id,email) VALUES ('aaaaaaaa-0000-4000-8000-00000000000a','nope@test.local');
    RAISE EXCEPTION 'FAIL: viewer created an invitation';
  EXCEPTION WHEN sqlstate '42501' THEN
    RAISE NOTICE 'PASS    [5b] viewer cannot create invitations';
  END;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- (6) audit_events append-only: INSERT allowed, UPDATE/DELETE blocked
-- ---------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"iss":"supabase","role":"authenticated","sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
DO $$
DECLARE n int;
BEGIN
  INSERT INTO public.audit_events (organization_id,actor_id,action) VALUES ('aaaaaaaa-0000-4000-8000-00000000000a','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ping');

  UPDATE public.audit_events SET action='tampered' WHERE organization_id='aaaaaaaa-0000-4000-8000-00000000000a';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated updated audit event (rows=%)', n; END IF;

  DELETE FROM public.audit_events WHERE organization_id='aaaaaaaa-0000-4000-8000-00000000000a';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated deleted audit event (rows=%)', n; END IF;

  RAISE NOTICE 'PASS    [6] audit_events append-only for authenticated';
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- (7) privileged system ops: service_role may mutate the audit log
-- ---------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE n int;
BEGIN
  UPDATE public.audit_events SET action='system-reconcile' WHERE organization_id='aaaaaaaa-0000-4000-8000-00000000000a';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'FAIL: service_role could not update audit event'; END IF;
  RAISE NOTICE 'PASS    [7] service_role may perform privileged audit ops (rows=%)', n;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- (8) a2a_audit_entries: append-only by trigger for EVERY role, including
--     privileged ones (service_role / postgres). Integrity repair appends.
-- ---------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE n int;
BEGIN
  INSERT INTO public.a2a_audit_entries
    (organization_id, sequence, action, actor_type, outcome, prev_hash, entry_hash)
  VALUES
    ('aaaaaaaa-0000-4000-8000-00000000000a', 1, 'task_created',     'user',  'ok', repeat('0', 64), md5(random()::text)),
    ('aaaaaaaa-0000-4000-8000-00000000000a', 2, 'task_dispatched', 'agent', 'ok', md5(random()::text), md5(random()::text));

  BEGIN
    UPDATE public.a2a_audit_entries SET outcome = 'tampered'
      WHERE organization_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
    RAISE EXCEPTION 'FAIL: privileged role updated a2a_audit_entries';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'a2a_audit_entries is append-only%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    DELETE FROM public.a2a_audit_entries
      WHERE organization_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
    RAISE EXCEPTION 'FAIL: privileged role deleted a2a_audit_entries';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'a2a_audit_entries is append-only%' THEN
      RAISE;
    END IF;
  END;

  SELECT count(*) INTO n FROM public.a2a_audit_entries
    WHERE organization_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
  IF n <> 2 THEN
    RAISE EXCEPTION 'FAIL: a2a_audit_entries row count changed (rows=%)', n;
  END IF;

  BEGIN
    INSERT INTO public.a2a_audit_entries
      (organization_id, sequence, action, actor_type, outcome, prev_hash, entry_hash)
    VALUES
      ('aaaaaaaa-0000-4000-8000-00000000000a', 2, 'fork_attempt', 'agent', 'ok', repeat('0', 64), md5(random()::text));
    RAISE EXCEPTION 'FAIL: duplicate (organization_id, sequence) was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RAISE NOTICE 'PASS    [8] a2a_audit_entries append-only for every role + unique sequence';
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- (9) a2a ledger cross-tenant denial: Org A member cannot see Org B entries
-- ---------------------------------------------------------------------------
BEGIN;
INSERT INTO public.a2a_audit_entries
  (organization_id, sequence, action, actor_type, outcome, prev_hash, entry_hash)
VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000b', 1, 'task_created', 'user', 'ok', repeat('0', 64), md5(random()::text));

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"iss":"supabase","role":"authenticated","sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.a2a_audit_entries
    WHERE organization_id = 'aaaaaaaa-0000-4000-8000-00000000000b';
  IF n <> 0 THEN
    RAISE EXCEPTION 'ISOLATION FAIL: user A read Org B ledger entries (rows=%)', n;
  END IF;
  RAISE NOTICE 'PASS    [9] A cannot read Org B ledger entries';
END $$;
ROLLBACK;

\echo 'TENANT ISOLATION: ALL CHECKS PASSED'