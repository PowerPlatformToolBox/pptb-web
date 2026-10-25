-- Breaking rename. Run as database owner after the claiming and cleanup scripts.
-- Coordinate website and desktop deployments; no old table/RPC aliases remain.
-- Preserves records, RLS, grants, foreign keys, votes and claims. Safe to reapply.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.tool_ideas') IS NOT NULL THEN
        IF to_regclass('public.ideas') IS NOT NULL THEN
            RAISE EXCEPTION 'Both tool_ideas and ideas exist; reconcile them before renaming';
        END IF;
        ALTER TABLE public.tool_ideas RENAME TO ideas;
    END IF;
    IF to_regclass('public.tool_idea_votes') IS NOT NULL THEN
        IF to_regclass('public.idea_votes') IS NOT NULL THEN
            RAISE EXCEPTION 'Both vote tables exist; reconcile them before renaming';
        END IF;
        ALTER TABLE public.tool_idea_votes RENAME TO idea_votes;
    END IF;
    IF to_regclass('public.ideas') IS NULL OR to_regclass('public.idea_votes') IS NULL THEN
        RAISE EXCEPTION 'The existing ideas schema is required';
    END IF;
END $$;

LOCK TABLE public.ideas, public.idea_votes, public.tool_intakes IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tool_intakes' AND column_name = 'tool_idea_id') THEN
        ALTER TABLE public.tool_intakes RENAME COLUMN tool_idea_id TO idea_id;
    END IF;
    IF to_regprocedure('public.upvote_tool_idea(uuid,text)') IS NOT NULL THEN
        ALTER FUNCTION public.upvote_tool_idea(uuid,text) RENAME TO upvote_idea;
    END IF;
    IF to_regprocedure('public.remove_tool_idea_vote(uuid,text)') IS NOT NULL THEN
        ALTER FUNCTION public.remove_tool_idea_vote(uuid,text) RENAME TO remove_idea_vote;
    END IF;
    IF to_regprocedure('public.claim_tool_idea(uuid,text)') IS NOT NULL THEN
        ALTER FUNCTION public.claim_tool_idea(uuid,text) RENAME TO claim_idea;
    END IF;
    -- This six-column helper intentionally remains Tool Ideas-only.
    IF to_regprocedure('public.get_tool_ideas(text)') IS NOT NULL THEN
        ALTER FUNCTION public.get_tool_ideas(text) RENAME TO get_open_tool_ideas;
    END IF;
    IF to_regprocedure('public.validate_tool_intake_idea()') IS NOT NULL THEN
        ALTER FUNCTION public.validate_tool_intake_idea() RENAME TO validate_intake_idea;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.tool_intakes'::regclass
        AND tgname = 'validate_tool_intake_idea' AND NOT tgisinternal) THEN
        ALTER TRIGGER validate_tool_intake_idea ON public.tool_intakes RENAME TO validate_intake_idea;
    END IF;
END $$;

-- Table renames update catalog dependencies, but SQL/PLpgSQL string bodies and
-- intake JSON keys must be updated explicitly. Preserve function signatures,
-- ownership, grants, search paths and security attributes via pg_get_functiondef.
DO $$
DECLARE fn record; definition text; updated_source text;
BEGIN
    FOR fn IN
        SELECT p.oid, p.prosrc
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prokind = 'f'
            AND p.prolang IN (SELECT oid FROM pg_language WHERE lanname IN ('sql', 'plpgsql'))
            AND p.prosrc ~ '\m(tool_ideas|tool_idea_votes|tool_idea_id|get_tool_ideas|upvote_tool_idea|remove_tool_idea_vote|claim_tool_idea|validate_tool_intake_idea)\M'
    LOOP
        updated_source := fn.prosrc;
        updated_source := regexp_replace(updated_source, '\mtool_ideas\M', 'ideas', 'g');
        updated_source := regexp_replace(updated_source, '\mtool_idea_votes\M', 'idea_votes', 'g');
        updated_source := regexp_replace(updated_source, '\mtool_idea_id\M', 'idea_id', 'g');
        updated_source := regexp_replace(updated_source, '\mget_tool_ideas\M', 'get_open_tool_ideas', 'g');
        updated_source := regexp_replace(updated_source, '\mupvote_tool_idea\M', 'upvote_idea', 'g');
        updated_source := regexp_replace(updated_source, '\mremove_tool_idea_vote\M', 'remove_idea_vote', 'g');
        updated_source := regexp_replace(updated_source, '\mclaim_tool_idea\M', 'claim_idea', 'g');
        updated_source := regexp_replace(updated_source, '\mvalidate_tool_intake_idea\M', 'validate_intake_idea', 'g');
        definition := replace(pg_get_functiondef(fn.oid), fn.prosrc, updated_source);
        EXECUTE definition;
    END LOOP;
END $$;

-- Keep the FK name used by PostgREST embeds and related indexes consistent.
DO $$
DECLARE item record; new_name text;
BEGIN
    FOR item IN SELECT conrelid::regclass AS relation, conname FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
            AND conname ~ '(tool_ideas|tool_idea_votes|tool_idea_id)'
            AND conrelid IN ('public.ideas'::regclass, 'public.idea_votes'::regclass, 'public.tool_intakes'::regclass)
    LOOP
        new_name := replace(replace(replace(item.conname, 'tool_idea_votes', 'idea_votes'), 'tool_ideas', 'ideas'), 'tool_idea_id', 'idea_id');
        EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', item.relation, item.conname, new_name);
    END LOOP;
    FOR item IN SELECT c.oid::regclass AS relation, c.relname
        FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
        WHERE i.indrelid IN ('public.ideas'::regclass, 'public.idea_votes'::regclass, 'public.tool_intakes'::regclass)
            AND c.relname ~ '(tool_ideas|tool_idea_votes|tool_idea_id)'
    LOOP
        new_name := replace(replace(replace(item.relname, 'tool_idea_votes', 'idea_votes'), 'tool_ideas', 'ideas'), 'tool_idea_id', 'idea_id');
        EXECUTE format('ALTER INDEX %s RENAME TO %I', item.relation, new_name);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
