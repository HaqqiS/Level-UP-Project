-- Defense-in-depth: enable RLS on all public schema tables so that even if
-- Supabase Data API (PostgREST) is enabled in the future, anon/authenticated
-- roles have zero direct table access without explicit policies.
-- Server-side Prisma + Better Auth connect as the postgres role (BYPASSRLS).
DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
END
$$;
