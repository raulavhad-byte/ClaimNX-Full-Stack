-- ClaimNX Security - lock down the Supabase public schema.
--
-- ClaimNX deliberately uses a server-only data access model: browser clients
-- call the NestJS API and never query Supabase directly.  This migration makes
-- that boundary enforceable by enabling RLS for every application table and
-- removing all table and sequence privileges from Supabase browser roles.
--
-- The backend authenticates with SUPABASE_SERVICE_ROLE_KEY. The service_role
-- database role bypasses RLS, so existing backend repository access remains
-- available. Do not expose that key to the frontend.

BEGIN;

-- Prevent direct PostgREST access from both unauthenticated and authenticated
-- browser sessions. New tables created by the migration role inherit this
-- posture as well.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;

-- Existing raw-SQL migrations created tables without RLS. Lock down all
-- application tables, including any table introduced by an earlier phase.
-- spatial_ref_sys is PostGIS extension metadata, not ClaimNX application data.
DO $$
DECLARE
  application_table RECORD;
BEGIN
  FOR application_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'spatial_ref_sys'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      application_table.tablename
    );
    EXECUTE format(
      'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
      application_table.tablename
    );
  END LOOP;
END;
$$;

-- Deployment guard: every ClaimNX public table must now have RLS enabled and
-- forced, so a future owner-role connection cannot accidentally bypass it.
DO $$
DECLARE
  unsecured_tables TEXT;
BEGIN
  SELECT string_agg(quote_ident(relation.relname), ', ' ORDER BY relation.relname)
  INTO unsecured_tables
  FROM pg_class relation
  JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p')
    AND relation.relname <> 'spatial_ref_sys'
    AND (NOT relation.relrowsecurity OR NOT relation.relforcerowsecurity);

  IF unsecured_tables IS NOT NULL THEN
    RAISE EXCEPTION
      'RLS lockdown failed for public table(s): %', unsecured_tables;
  END IF;
END;
$$;

COMMIT;
