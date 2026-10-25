-- Apply after ideas-migration.sql. Safe to reapply.
-- Allows trusted backend type corrections without granting clients new UPDATE access.
BEGIN;

CREATE OR REPLACE FUNCTION public.validate_idea_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.idea_type IS DISTINCT FROM OLD.idea_type THEN
        IF current_user NOT IN ('postgres', 'service_role') AND NOT EXISTS (
            SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Admin access required to change idea types' USING ERRCODE = '42501';
        END IF;
        IF NEW.idea_type <> 'tool' AND EXISTS (
            SELECT 1 FROM public.tool_intakes WHERE tool_idea_id = OLD.id
        ) THEN
            RAISE EXCEPTION 'Unlink tool intakes before changing this Tool Idea to a PPTB idea' USING ERRCODE = '22023';
        END IF;
    END IF;
    IF NEW.duplicate_of IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(731420260);
        IF EXISTS (
            WITH RECURSIVE chain AS (
                SELECT id, duplicate_of FROM public.tool_ideas WHERE id = NEW.duplicate_of
                UNION
                SELECT i.id, i.duplicate_of FROM public.tool_ideas i JOIN chain c ON i.id = c.duplicate_of
            )
            SELECT 1 FROM chain WHERE id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Duplicate references cannot form a cycle' USING ERRCODE = '22023';
        END IF;
    END IF;
    -- Database-editor writes have no app user; do not attribute them to an earlier reviewer.
    NEW.updated_by := auth.uid();
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.record_idea_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    previous_review jsonb;
    new_review jsonb;
BEGIN
    previous_review := jsonb_build_object('idea_type', OLD.idea_type, 'title', OLD.title,
        'description', OLD.description, 'status', OLD.status, 'resolution', OLD.resolution,
        'public_note', OLD.public_note, 'duplicate_of', OLD.duplicate_of, 'github_issue_url', OLD.github_issue_url);
    new_review := jsonb_build_object('idea_type', NEW.idea_type, 'title', NEW.title,
        'description', NEW.description, 'status', NEW.status, 'resolution', NEW.resolution,
        'public_note', NEW.public_note, 'duplicate_of', NEW.duplicate_of, 'github_issue_url', NEW.github_issue_url);
    IF previous_review IS DISTINCT FROM new_review THEN
        INSERT INTO public.idea_review_history(idea_id, changed_by, previous_review, new_review)
        VALUES (NEW.id, NEW.updated_by, previous_review, new_review);
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_idea_review(), public.record_idea_review() FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
