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

DROP FUNCTION IF EXISTS app_user_role_in(text) CASCADE;
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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Invitation" TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE "Subscription" TO app_user;
GRANT SELECT, UPDATE ON TABLE "Entitlement" TO app_user;
GRANT SELECT, INSERT ON TABLE "UsageEvent" TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE "AiRun" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Project" TO app_user;

ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Entitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Entitlement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AiRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRun" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitation_org_scope ON "Invitation";
CREATE POLICY invitation_org_scope ON "Invitation" FOR ALL
  USING (
    app_user_role_in("Invitation"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    app_user_role_in("Invitation"."organizationId") IN ('OWNER', 'ADMIN')
  );

DROP POLICY IF EXISTS subscription_org_scope ON "Subscription";
CREATE POLICY subscription_org_scope ON "Subscription" FOR ALL
  USING (
    app_user_role_in("Subscription"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    app_user_role_in("Subscription"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS entitlement_org_scope ON "Entitlement";
CREATE POLICY entitlement_org_scope ON "Entitlement" FOR ALL
  USING (
    app_user_role_in("Entitlement"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    app_user_role_in("Entitlement"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS usage_event_org_scope ON "UsageEvent";
CREATE POLICY usage_event_org_scope ON "UsageEvent" FOR INSERT
  WITH CHECK (
    app_user_role_in("UsageEvent"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS usage_event_select ON "UsageEvent";
CREATE POLICY usage_event_select ON "UsageEvent" FOR SELECT
  USING (
    app_user_role_in("UsageEvent"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS ai_run_org_scope ON "AiRun";
CREATE POLICY ai_run_org_scope ON "AiRun" FOR ALL
  USING (
    app_user_role_in("AiRun"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    app_user_role_in("AiRun"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS project_org_scope ON "Project";
CREATE POLICY project_org_scope ON "Project" FOR ALL
  USING (
    app_user_role_in("Project"."organizationId") IS NOT NULL
    OR "Project"."ownerUserId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    app_user_role_in("Project"."organizationId") IS NOT NULL
  );

GRANT SELECT, INSERT, UPDATE ON TABLE "AgentTaskExecution" TO app_user;

ALTER TABLE "AgentTaskExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentTaskExecution" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_task_select ON "AgentTaskExecution";
CREATE POLICY agent_task_select ON "AgentTaskExecution" FOR SELECT
  USING (
    app_user_role_in("AgentTaskExecution"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS agent_task_insert ON "AgentTaskExecution";
CREATE POLICY agent_task_insert ON "AgentTaskExecution" FOR INSERT
  WITH CHECK (
    app_user_role_in("AgentTaskExecution"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS agent_task_review_update ON "AgentTaskExecution";
CREATE POLICY agent_task_review_update ON "AgentTaskExecution" FOR UPDATE
  USING (
    app_user_role_in("AgentTaskExecution"."organizationId") IN ('OWNER', 'ADMIN')
  )
  WITH CHECK (
    app_user_role_in("AgentTaskExecution"."organizationId") IN ('OWNER', 'ADMIN')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "GuardianLink" TO app_user;
GRANT SELECT, INSERT ON TABLE "GuardianConsent" TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE "AgentRegistration" TO app_user;

ALTER TABLE "GuardianLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GuardianLink" FORCE ROW LEVEL SECURITY;
ALTER TABLE "GuardianConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GuardianConsent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AgentRegistration" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO app_agent;

GRANT SELECT, INSERT ON TABLE "A2AAuditEntry" TO app_user;

ALTER TABLE "A2AAuditEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "A2AAuditEntry" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS a2a_audit_select ON "A2AAuditEntry";
CREATE POLICY a2a_audit_select ON "A2AAuditEntry" FOR SELECT
  USING (
    app_user_role_in("A2AAuditEntry"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS a2a_audit_insert ON "A2AAuditEntry";
CREATE POLICY a2a_audit_insert ON "A2AAuditEntry" FOR INSERT
  WITH CHECK (
    app_user_role_in("A2AAuditEntry"."organizationId") IS NOT NULL
  );

GRANT SELECT, INSERT, UPDATE ON TABLE "AgentTaskExecution" TO app_agent;
GRANT SELECT, INSERT ON TABLE "A2AAuditEntry" TO app_agent;
GRANT SELECT, INSERT ON TABLE "AuditLog" TO app_agent;
GRANT SELECT ON TABLE "AgentRegistration" TO app_agent;

DROP POLICY IF EXISTS agent_task_agent_select ON "AgentTaskExecution";
CREATE POLICY agent_task_agent_select ON "AgentTaskExecution" FOR SELECT TO app_agent
  USING (
    current_setting('app.current_org_id', true) = "AgentTaskExecution"."organizationId"
  );

DROP POLICY IF EXISTS agent_task_agent_insert ON "AgentTaskExecution";
CREATE POLICY agent_task_agent_insert ON "AgentTaskExecution" FOR INSERT TO app_agent
  WITH CHECK (
    current_setting('app.current_org_id', true) = "AgentTaskExecution"."organizationId"
  );

DROP POLICY IF EXISTS agent_task_agent_update ON "AgentTaskExecution";
CREATE POLICY agent_task_agent_update ON "AgentTaskExecution" FOR UPDATE TO app_agent
  USING (
    current_setting('app.current_org_id', true) = "AgentTaskExecution"."organizationId"
  )
  WITH CHECK (
    current_setting('app.current_org_id', true) = "AgentTaskExecution"."organizationId"
  );

DROP POLICY IF EXISTS a2a_audit_agent_select ON "A2AAuditEntry";
CREATE POLICY a2a_audit_agent_select ON "A2AAuditEntry" FOR SELECT TO app_agent
  USING (
    current_setting('app.current_org_id', true) = "A2AAuditEntry"."organizationId"
  );

DROP POLICY IF EXISTS a2a_audit_agent_insert ON "A2AAuditEntry";
CREATE POLICY a2a_audit_agent_insert ON "A2AAuditEntry" FOR INSERT TO app_agent
  WITH CHECK (
    current_setting('app.current_org_id', true) = "A2AAuditEntry"."organizationId"
  );

DROP POLICY IF EXISTS agent_registration_agent_read ON "AgentRegistration";
CREATE POLICY agent_registration_agent_read ON "AgentRegistration" FOR SELECT TO app_agent
  USING (
    "AgentRegistration"."orgId" IS NULL
    OR "AgentRegistration"."orgId" = current_setting('app.current_org_id', true)
  );
ALTER TABLE "AgentRegistration" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AgentKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentKey" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardian_link_org_scope ON "GuardianLink";
CREATE POLICY guardian_link_org_scope ON "GuardianLink" FOR ALL
  USING (
    app_user_role_in("GuardianLink"."organizationId") IS NOT NULL
  )
  WITH CHECK (
    app_user_role_in("GuardianLink"."organizationId") IN ('OWNER', 'ADMIN')
  );

DROP POLICY IF EXISTS guardian_consent_select ON "GuardianConsent";
CREATE POLICY guardian_consent_select ON "GuardianConsent" FOR SELECT
  USING (
    app_user_role_in("GuardianConsent"."organizationId") IS NOT NULL
  );

DROP POLICY IF EXISTS guardian_consent_insert ON "GuardianConsent";
CREATE POLICY guardian_consent_insert ON "GuardianConsent" FOR INSERT
  WITH CHECK (
    app_user_role_in("GuardianConsent"."organizationId") IN ('OWNER', 'ADMIN')
  );

DROP POLICY IF EXISTS agent_registration_org_scope ON "AgentRegistration";
CREATE POLICY agent_registration_org_scope ON "AgentRegistration" FOR ALL
  USING (
    app_user_role_in("AgentRegistration"."orgId") IS NOT NULL
  )
  WITH CHECK (
    app_user_role_in("AgentRegistration"."orgId") IN ('OWNER', 'ADMIN')
  );