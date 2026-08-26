-- RLS bootstrap for The Blueprint.
-- Executed by scripts/apply-rls.ts (via npm run db:rls) AFTER `prisma db push`.
-- Statements are split on ';' by the script: do NOT put semicolons inside string literals here.
-- The app role (app_user) must never own tables or be superuser: superusers and owners bypass RLS.

GRANT USAGE ON SCHEMA public TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Organization" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Membership" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Athlete" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Brand" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Opportunity" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Deal" TO app_user;
GRANT SELECT, INSERT ON TABLE "AuditLog" TO app_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Athlete" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Athlete" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS app_user_role_in(text);
CREATE OR REPLACE FUNCTION app_user_role_in(target_organization_id text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
SELECT m."role" FROM "Membership" m
WHERE m."userId" = current_setting('app.current_user_id', true)
  AND m."organizationId" = target_organization_id
LIMIT 1
$$;

DROP POLICY IF EXISTS org_created_by ON "Organization";
CREATE POLICY org_created_by ON "Organization" FOR ALL
  USING (
    "Organization"."createdById" = current_setting('app.current_user_id', true)
    OR app_user_role_in("Organization"."id") IS NOT NULL
  )
  WITH CHECK (
    "Organization"."createdById" = current_setting('app.current_user_id', true)
  );

DROP POLICY IF EXISTS membership_org_scope ON "Membership";
CREATE POLICY membership_org_scope ON "Membership" FOR ALL
  USING (
    app_user_role_in("Membership"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    app_user_role_in("Membership"."organizationId") IN ('OWNER', 'ADMIN')
  );

DROP POLICY IF EXISTS user_self ON "User";
CREATE POLICY user_self ON "User" FOR ALL
  USING (id = current_setting('app.current_user_id', true))
  WITH CHECK (id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS athlete_owner ON "Athlete";
CREATE POLICY athlete_owner ON "Athlete" FOR ALL
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS brand_owner ON "Brand";
CREATE POLICY brand_owner ON "Brand" FOR ALL
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS opportunity_owner ON "Opportunity";
CREATE POLICY opportunity_owner ON "Opportunity" FOR ALL
  USING (
    "Opportunity"."ownerUserId" = current_setting('app.current_user_id', true)
    OR app_user_role_in("Opportunity"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    "Opportunity"."ownerUserId" = current_setting('app.current_user_id', true)
    OR app_user_role_in("Opportunity"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS deal_owner ON "Deal";
CREATE POLICY deal_owner ON "Deal" FOR ALL
  USING (
    "Deal"."ownerUserId" = current_setting('app.current_user_id', true)
    OR app_user_role_in("Deal"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    "Deal"."ownerUserId" = current_setting('app.current_user_id', true)
    OR app_user_role_in("Deal"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS audit_insert ON "AuditLog";
CREATE POLICY audit_insert ON "AuditLog" FOR INSERT
  WITH CHECK (
    "actorId" = current_setting('app.current_user_id', true)
    OR app_user_role_in("AuditLog"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS audit_select_own ON "AuditLog";
CREATE POLICY audit_select_own ON "AuditLog" FOR SELECT
  USING (
    "actorId" = current_setting('app.current_user_id', true)
    OR app_user_role_in("AuditLog"."organizationId") IS NOT NULL
  );
