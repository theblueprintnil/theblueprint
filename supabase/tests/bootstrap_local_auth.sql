-- ============================================================================
-- bootstrap_local_auth.sql
-- LOCAL DEV / VALIDATION ONLY. Do NOT run on a hosted Supabase project.
--
-- Creates a minimal auth schema (auth.users, auth.uid(), auth.role()) and the
-- standard Supabase roles (authenticated, anon, service_role) so the canonical
-- migrations and the tenant-isolation test can run against a plain PostgreSQL
-- 16 (e.g. the local docker-compose blueprint-db). Idempotent.
-- ============================================================================

\set ON_ERROR_STOP on

-- Standard Supabase roles referenced by the RLS migration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'create role authenticated nologin';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'create role anon nologin';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE 'create role service_role nologin superuser bypassrls';
    END IF;
END $$;

-- Create the minimal auth schema only when it does not already exist
SELECT (to_regnamespace('auth') IS NOT NULL) AS has_auth \gset
\if :has_auth
    \echo 'auth schema already present - skipping local auth bootstrap'
\else
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
        id                 uuid primary key,
        email              text unique,
        raw_user_meta_data jsonb default '{}'::jsonb,
        created_at         timestamptz not null default now()
    );

    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
        select (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    $$;

    CREATE FUNCTION auth.role()
    RETURNS text
    LANGUAGE sql STABLE
    AS $$
        select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'anon');
    $$;
\endif