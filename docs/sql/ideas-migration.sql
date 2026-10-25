-- Apply once, before deploying the new website/desktop. Run preflight first.
BEGIN;

LOCK TABLE public.tool_ideas, public.tool_idea_votes, public.tool_intakes IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE ideas_migration_counts ON COMMIT DROP AS
SELECT (SELECT count(*) FROM public.tool_ideas) AS ideas,
    (SELECT count(*) FROM public.tool_idea_votes) AS votes,
    (SELECT count(*) FROM public.tool_intakes WHERE tool_idea_id IS NOT NULL) AS linked_intakes;
ALTER TABLE pg_temp.ideas_migration_counts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tool_ideas WHERE status <> 'open') THEN
        RAISE EXCEPTION 'Unexpected legacy statuses. Agree an explicit mapping before migrating.';
    END IF;
END $$;

ALTER TABLE public.tool_ideas
    ADD COLUMN idea_type text NOT NULL DEFAULT 'tool',
    ADD COLUMN resolution text,
    ADD COLUMN public_note text,
    ADD COLUMN duplicate_of uuid REFERENCES public.tool_ideas(id),
    ADD COLUMN github_issue_url text,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT ideas_type_check CHECK (idea_type IN ('tool', 'pptb_desktop', 'pptb_vscode')),
    ADD CONSTRAINT ideas_status_check CHECK (status IN ('open', 'under_review', 'planned', 'closed', 'duplicate')),
    ADD CONSTRAINT ideas_resolution_check CHECK (
        (status = 'closed' AND resolution IS NOT NULL AND resolution IN ('implemented', 'not_planned', 'out_of_scope', 'withdrawn')
            AND public_note IS NOT NULL AND public_note ~ '[^[:space:]]')
        OR (status <> 'closed' AND resolution IS NULL)
    ),
    ADD CONSTRAINT ideas_note_check CHECK (public_note IS NULL OR length(public_note) <= 3000),
    ADD CONSTRAINT ideas_duplicate_check CHECK (
        (status = 'duplicate' AND duplicate_of IS NOT NULL AND duplicate_of <> id)
        OR (status <> 'duplicate' AND duplicate_of IS NULL)
    ),
    ADD CONSTRAINT ideas_github_check CHECK (
        github_issue_url IS NULL OR
        (idea_type = 'pptb_desktop' AND github_issue_url ~ '^https://github\.com/PowerPlatformToolBox/desktop-app/issues/[1-9][0-9]*$') OR
        (idea_type = 'pptb_vscode' AND github_issue_url ~ '^https://github\.com/PowerPlatformToolBox/vscode-extension/issues/[1-9][0-9]*$')
    );

CREATE INDEX ideas_duplicate_of_idx ON public.tool_ideas(duplicate_of) WHERE duplicate_of IS NOT NULL;

CREATE TABLE public.idea_review_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id uuid NOT NULL REFERENCES public.tool_ideas(id),
    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    previous_review jsonb NOT NULL,
    new_review jsonb NOT NULL
);
CREATE INDEX idea_review_history_idea_idx ON public.idea_review_history(idea_id, changed_at);
ALTER TABLE public.idea_review_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idea_review_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.idea_review_history TO authenticated;
GRANT ALL ON public.idea_review_history TO service_role;
CREATE POLICY "Admins can read idea review history" ON public.idea_review_history
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Legacy submissions still work, but cannot supply maintainer-controlled metadata.
ALTER POLICY "Clients can submit ideas" ON public.tool_ideas
    WITH CHECK (
        status = 'open' AND resolution IS NULL AND public_note IS NULL
        AND duplicate_of IS NULL AND github_issue_url IS NULL AND updated_by IS NULL
    );
-- RLS does not protect TRUNCATE. Preserve existing DML contracts, not table-wide deletion.
REVOKE TRUNCATE ON public.tool_ideas, public.tool_idea_votes FROM anon, authenticated;

CREATE FUNCTION public.validate_idea_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.idea_type IS DISTINCT FROM OLD.idea_type THEN
        RAISE EXCEPTION 'Idea types cannot be changed after submission' USING ERRCODE = '22023';
    END IF;
    IF NEW.duplicate_of IS NOT NULL THEN
        -- Serialize graph edits, including reviews performed by the service role.
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
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END $$;

CREATE TRIGGER validate_idea_review BEFORE UPDATE ON public.tool_ideas
    FOR EACH ROW EXECUTE FUNCTION public.validate_idea_review();

CREATE FUNCTION public.record_idea_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    previous_review jsonb;
    new_review jsonb;
BEGIN
    previous_review := jsonb_build_object('status', OLD.status, 'resolution', OLD.resolution,
        'public_note', OLD.public_note, 'duplicate_of', OLD.duplicate_of, 'github_issue_url', OLD.github_issue_url);
    new_review := jsonb_build_object('status', NEW.status, 'resolution', NEW.resolution,
        'public_note', NEW.public_note, 'duplicate_of', NEW.duplicate_of, 'github_issue_url', NEW.github_issue_url);
    IF previous_review IS DISTINCT FROM new_review THEN
        INSERT INTO public.idea_review_history(idea_id, changed_by, previous_review, new_review)
        VALUES (NEW.id, NEW.updated_by, previous_review, new_review);
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER record_idea_review AFTER UPDATE ON public.tool_ideas
    FOR EACH ROW EXECUTE FUNCTION public.record_idea_review();

CREATE FUNCTION public.get_ideas(p_install_id text DEFAULT '')
RETURNS TABLE (
    id uuid, title text, description text, idea_type text, status text, resolution text,
    public_note text, duplicate_of uuid, github_issue_url text,
    created_at timestamptz, updated_at timestamptz, upvotes bigint, has_upvoted boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT i.id, i.title, i.description, i.idea_type, i.status, i.resolution,
        i.public_note, i.duplicate_of, i.github_issue_url, i.created_at, i.updated_at,
        (SELECT count(*) FROM public.tool_idea_votes v WHERE v.idea_id = i.id),
        EXISTS (SELECT 1 FROM public.tool_idea_votes v WHERE v.idea_id = i.id AND v.voter_id =
            CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text
                 WHEN nullif(btrim(p_install_id), '') IS NOT NULL THEN 'install:' || p_install_id
                 ELSE NULL END)
    FROM public.tool_ideas i
    ORDER BY (SELECT count(*) FROM public.tool_idea_votes v WHERE v.idea_id = i.id) DESC, i.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_ideas(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ideas(text) TO anon, authenticated, service_role;

-- Keep the exact legacy signature and shape; older clients see only open Tool Ideas.
CREATE OR REPLACE FUNCTION public.get_tool_ideas(p_install_id text)
RETURNS TABLE(id uuid, title text, description text, upvotes bigint, created_at timestamptz, has_upvoted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT i.id, i.title, i.description, i.upvotes, i.created_at, i.has_upvoted
    FROM public.get_ideas(p_install_id) i
    WHERE i.idea_type = 'tool' AND i.status = 'open'
    ORDER BY i.upvotes DESC, i.created_at DESC;
$$;

-- Existing clients use the same vote contract. Lock the idea against concurrent closure.
CREATE OR REPLACE FUNCTION public.upvote_tool_idea(p_idea_id uuid, p_install_id text)
RETURNS TABLE(upvotes bigint, has_upvoted boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    idea_status text;
    voter text;
BEGIN
    voter := CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text
        WHEN nullif(btrim(p_install_id), '') IS NOT NULL THEN 'install:' || p_install_id ELSE NULL END;
    IF voter IS NULL THEN
        RAISE EXCEPTION 'Sign in or provide an installation ID to vote' USING ERRCODE = '22023';
    END IF;
    SELECT i.status INTO idea_status FROM public.tool_ideas i WHERE i.id = p_idea_id FOR SHARE;
    IF idea_status IS NULL OR idea_status NOT IN ('open', 'under_review', 'planned') THEN
        RAISE EXCEPTION 'This idea is not accepting votes' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.tool_idea_votes(idea_id, voter_id) VALUES (p_idea_id, voter)
        ON CONFLICT (idea_id, voter_id) DO NOTHING;
    RETURN QUERY SELECT count(*), EXISTS (
        SELECT 1 FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id AND v.voter_id = voter
    ) FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id;
END $$;

-- Protect eligibility even when votes are inserted using the service role.
CREATE FUNCTION public.validate_idea_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea_status text;
BEGIN
    SELECT status INTO idea_status FROM public.tool_ideas WHERE id = NEW.idea_id FOR SHARE;
    IF idea_status IS NULL OR idea_status NOT IN ('open', 'under_review', 'planned') THEN
        RAISE EXCEPTION 'This idea is not accepting votes' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_idea_vote BEFORE INSERT OR UPDATE ON public.tool_idea_votes
    FOR EACH ROW EXECUTE FUNCTION public.validate_idea_vote();

CREATE FUNCTION public.review_idea(
    p_id uuid, p_expected_updated_at timestamptz, p_status text, p_resolution text,
    p_public_note text, p_duplicate_of uuid, p_github_issue_url text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_idea public.tool_ideas;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
    END IF;
    PERFORM pg_advisory_xact_lock(731420260);
    SELECT * INTO current_idea FROM public.tool_ideas WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found' USING ERRCODE = 'P0002';
    END IF;
    IF p_expected_updated_at IS NULL OR current_idea.updated_at <> p_expected_updated_at THEN
        RAISE EXCEPTION 'Idea changed. Reload before saving.' USING ERRCODE = '40001';
    END IF;
    UPDATE public.tool_ideas SET
        status = p_status, resolution = p_resolution, public_note = nullif(btrim(p_public_note), ''),
        duplicate_of = p_duplicate_of, github_issue_url = nullif(btrim(p_github_issue_url), ''),
        updated_by = auth.uid()
    WHERE id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.review_idea(uuid, timestamptz, text, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_idea(uuid, timestamptz, text, text, text, uuid, text) TO authenticated;

CREATE FUNCTION public.validate_tool_intake_idea()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.tool_idea_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.tool_ideas WHERE id = NEW.tool_idea_id AND idea_type = 'tool'
    ) THEN
        RAISE EXCEPTION 'Tool submissions can only link to Tool Ideas' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_tool_intake_idea BEFORE INSERT OR UPDATE OF tool_idea_id ON public.tool_intakes
    FOR EACH ROW EXECUTE FUNCTION public.validate_tool_intake_idea();

REVOKE ALL ON FUNCTION public.validate_idea_review(), public.record_idea_review(),
    public.validate_idea_vote(), public.validate_tool_intake_idea() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM ideas_migration_counts c
        WHERE c.ideas <> (SELECT count(*) FROM public.tool_ideas)
           OR c.votes <> (SELECT count(*) FROM public.tool_idea_votes)
           OR c.linked_intakes <> (SELECT count(*) FROM public.tool_intakes WHERE tool_idea_id IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Migration changed existing row counts';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
