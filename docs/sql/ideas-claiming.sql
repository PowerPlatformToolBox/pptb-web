-- Apply AFTER ideas-migration.sql, ideas-remove-vote.sql, ideas-backend-edits.sql.
-- Additive, transactional, safe to reapply. Run as the database owner.
BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.review_idea(uuid,timestamptz,text,text,text,uuid,text)') IS NULL
        OR to_regclass('public.idea_review_history') IS NULL THEN
        RAISE EXCEPTION 'Apply the existing ideas migrations first';
    END IF;
END $$;

LOCK TABLE public.tool_ideas IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION public.is_idea_repository_url(value text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
    SELECT value IS NOT NULL AND length(value) <= 500
        AND value !~ '[[:space:][:cntrl:]]'
        AND value ~ '^https://github\.com/[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?/[A-Za-z0-9_.-]{1,100}$'
        AND split_part(value, '/', 5) NOT IN ('.', '..')
        AND value !~ '\.git$';
$$;

CREATE TABLE IF NOT EXISTS public.idea_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id uuid NOT NULL REFERENCES public.tool_ideas(id),
    claimant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    claimant_name text NOT NULL,
    repository_url text NOT NULL CHECK (public.is_idea_repository_url(repository_url)),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    released_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idea_claims_one_active ON public.idea_claims(idea_id) WHERE released_at IS NULL;
ALTER TABLE public.idea_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idea_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.idea_claims TO authenticated;
GRANT ALL ON public.idea_claims TO service_role;
DROP POLICY IF EXISTS "Admins can read idea claims" ON public.idea_claims;
CREATE POLICY "Admins can read idea claims" ON public.idea_claims FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE public.tool_ideas
    ADD COLUMN IF NOT EXISTS creator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS claim_id uuid REFERENCES public.idea_claims(id);
ALTER TABLE public.tool_ideas DROP CONSTRAINT IF EXISTS ideas_status_check;
ALTER TABLE public.tool_ideas ADD CONSTRAINT ideas_status_check
    CHECK (status IN ('open', 'under_review', 'planned', 'in_progress', 'closed', 'duplicate'));
ALTER TABLE public.tool_ideas DROP CONSTRAINT IF EXISTS ideas_claim_status_check;
ALTER TABLE public.tool_ideas ADD CONSTRAINT ideas_claim_status_check CHECK (
    (claim_id IS NULL AND status <> 'in_progress')
    OR (claim_id IS NOT NULL AND idea_type = 'tool' AND status IN ('in_progress', 'closed'))
);

CREATE OR REPLACE FUNCTION public.prepare_idea_submission()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.claim_id IS NOT NULL THEN
        RAISE EXCEPTION 'Ideas cannot be submitted with a claim' USING ERRCODE = '42501';
    END IF;
    -- Never infer account ownership from a client-supplied installation ID/email.
    NEW.creator_user_id := auth.uid();
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prepare_idea_submission ON public.tool_ideas;
CREATE TRIGGER prepare_idea_submission BEFORE INSERT ON public.tool_ideas
    FOR EACH ROW EXECUTE FUNCTION public.prepare_idea_submission();

CREATE OR REPLACE FUNCTION public.validate_idea_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.claim_id IS NOT NULL AND NEW.claim_id IS DISTINCT FROM OLD.claim_id
        AND EXISTS (SELECT 1 FROM public.idea_claims WHERE id = OLD.claim_id AND released_at IS NULL) THEN
        RAISE EXCEPTION 'Release the previous claim before removing ownership' USING ERRCODE = '23514';
    END IF;
    IF NEW.claim_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.idea_claims c WHERE c.id = NEW.claim_id
            AND c.idea_id = NEW.id AND c.released_at IS NULL
    ) THEN
        RAISE EXCEPTION 'The idea must reference its own active claim' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_idea_claim ON public.tool_ideas;
CREATE TRIGGER validate_idea_claim BEFORE INSERT OR UPDATE ON public.tool_ideas
    FOR EACH ROW EXECUTE FUNCTION public.validate_idea_claim();

CREATE OR REPLACE FUNCTION public.record_idea_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE previous_review jsonb; new_review jsonb;
BEGIN
    previous_review := jsonb_build_object('idea_type', OLD.idea_type, 'title', OLD.title,
        'description', OLD.description, 'status', OLD.status, 'resolution', OLD.resolution,
        'public_note', OLD.public_note, 'duplicate_of', OLD.duplicate_of,
        'github_issue_url', OLD.github_issue_url, 'claim_id', OLD.claim_id);
    new_review := jsonb_build_object('idea_type', NEW.idea_type, 'title', NEW.title,
        'description', NEW.description, 'status', NEW.status, 'resolution', NEW.resolution,
        'public_note', NEW.public_note, 'duplicate_of', NEW.duplicate_of,
        'github_issue_url', NEW.github_issue_url, 'claim_id', NEW.claim_id);
    IF previous_review IS DISTINCT FROM new_review THEN
        INSERT INTO public.idea_review_history(idea_id, changed_by, previous_review, new_review)
        VALUES (NEW.id, NEW.updated_by, previous_review, new_review);
    END IF;
    RETURN NEW;
END $$;

-- Keep get_ideas(text) and get_tool_ideas(text) unchanged for released clients.
CREATE OR REPLACE FUNCTION public.get_ideas_with_claims(p_install_id text DEFAULT '')
RETURNS TABLE (
    id uuid, title text, description text, idea_type text, status text, resolution text,
    public_note text, duplicate_of uuid, github_issue_url text,
    created_at timestamptz, updated_at timestamptz, upvotes bigint, has_upvoted boolean,
    claim_id uuid, claimant_name text, repository_url text, claimed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT i.*, c.id, c.claimant_name, c.repository_url, c.created_at
    FROM public.get_ideas(p_install_id) i
    JOIN public.tool_ideas source ON source.id = i.id
    LEFT JOIN public.idea_claims c ON c.id = source.claim_id
    ORDER BY i.upvotes DESC, i.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.claim_tool_idea(p_id uuid, p_repository_url text)
RETURNS TABLE (claim_id uuid, already_claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea public.tool_ideas; existing public.idea_claims; new_claim uuid; display_name text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_idea_repository_url(p_repository_url) THEN
        RAISE EXCEPTION 'Use a canonical HTTPS GitHub repository URL' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO idea FROM public.tool_ideas WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found' USING ERRCODE = 'P0002';
    END IF;
    IF idea.claim_id IS NOT NULL THEN
        SELECT * INTO existing FROM public.idea_claims WHERE id = idea.claim_id;
        IF idea.status = 'in_progress' AND existing.claimant_id = auth.uid()
            AND existing.repository_url = p_repository_url AND existing.released_at IS NULL THEN
            RETURN QUERY SELECT existing.id, true;
            RETURN;
        END IF;
    END IF;
    IF idea.idea_type <> 'tool' OR idea.status <> 'open' OR idea.claim_id IS NOT NULL THEN
        RAISE EXCEPTION 'This idea is no longer available to claim' USING ERRCODE = '40001';
    END IF;
    SELECT name INTO display_name FROM public.user_profiles WHERE id = auth.uid();
    IF display_name IS NULL OR btrim(display_name) = '' OR display_name ~ '[@[:cntrl:]]' THEN
        display_name := 'Community member';
    END IF;
    INSERT INTO public.idea_claims(idea_id, claimant_id, claimant_name, repository_url)
        VALUES (p_id, auth.uid(), left(btrim(display_name), 100), p_repository_url)
        RETURNING id INTO new_claim;
    UPDATE public.tool_ideas SET status = 'in_progress', claim_id = new_claim, updated_by = auth.uid() WHERE id = p_id;
    RETURN QUERY SELECT new_claim, false;
END $$;

CREATE OR REPLACE FUNCTION public.review_idea_with_claim(
    p_id uuid, p_expected_updated_at timestamptz, p_status text, p_resolution text,
    p_public_note text, p_duplicate_of uuid, p_github_issue_url text,
    p_repository_url text, p_release_claim boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea public.tool_ideas; previous_url text;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
    END IF;
    PERFORM pg_advisory_xact_lock(731420260);
    SELECT * INTO idea FROM public.tool_ideas WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found' USING ERRCODE = 'P0002';
    END IF;
    IF p_expected_updated_at IS NULL OR idea.updated_at <> p_expected_updated_at THEN
        RAISE EXCEPTION 'Idea changed. Reload before saving.' USING ERRCODE = '40001';
    END IF;
    IF p_release_claim IS NULL OR (p_release_claim AND (idea.claim_id IS NULL OR p_status <> 'open')) THEN
        RAISE EXCEPTION 'Release a claimed idea explicitly into Open status' USING ERRCODE = '22023';
    END IF;
    IF idea.claim_id IS NULL AND p_repository_url IS NOT NULL THEN
        RAISE EXCEPTION 'Only claimed ideas have a repository' USING ERRCODE = '22023';
    END IF;
    IF idea.claim_id IS NOT NULL THEN
        SELECT repository_url INTO previous_url FROM public.idea_claims WHERE id = idea.claim_id;
        IF NOT p_release_claim THEN
            IF NOT public.is_idea_repository_url(p_repository_url) THEN
                RAISE EXCEPTION 'A valid repository URL is required' USING ERRCODE = '22023';
            END IF;
            UPDATE public.idea_claims SET repository_url = p_repository_url WHERE id = idea.claim_id;
            IF previous_url IS DISTINCT FROM p_repository_url THEN
                INSERT INTO public.idea_review_history(idea_id, changed_by, previous_review, new_review)
                VALUES (p_id, auth.uid(), jsonb_build_object('claim_id', idea.claim_id, 'repository_url', previous_url),
                    jsonb_build_object('claim_id', idea.claim_id, 'repository_url', p_repository_url));
            END IF;
        ELSE
            UPDATE public.idea_claims SET released_at = clock_timestamp() WHERE id = idea.claim_id;
        END IF;
    END IF;
    UPDATE public.tool_ideas SET status = p_status, resolution = p_resolution,
        public_note = nullif(btrim(p_public_note), ''), duplicate_of = p_duplicate_of,
        github_issue_url = nullif(btrim(p_github_issue_url), ''),
        updated_by = auth.uid(),
        claim_id = CASE WHEN p_release_claim THEN NULL ELSE idea.claim_id END
    WHERE id = p_id;
END $$;

CREATE OR REPLACE FUNCTION public.upvote_tool_idea(p_idea_id uuid, p_install_id text)
RETURNS TABLE(upvotes bigint, has_upvoted boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea_status text; voter text;
BEGIN
    voter := CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text
        WHEN nullif(btrim(p_install_id), '') IS NOT NULL THEN 'install:' || p_install_id ELSE NULL END;
    IF voter IS NULL THEN
        RAISE EXCEPTION 'Sign in or provide an installation ID to vote' USING ERRCODE = '22023';
    END IF;
    SELECT i.status INTO idea_status FROM public.tool_ideas i WHERE i.id = p_idea_id FOR SHARE;
    IF idea_status IS NULL OR idea_status NOT IN ('open', 'under_review', 'planned', 'in_progress') THEN
        RAISE EXCEPTION 'This idea is not accepting votes' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.tool_idea_votes(idea_id, voter_id) VALUES (p_idea_id, voter) ON CONFLICT DO NOTHING;
    RETURN QUERY SELECT count(*), EXISTS (
        SELECT 1 FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id AND v.voter_id = voter
    ) FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id;
END $$;
CREATE OR REPLACE FUNCTION public.remove_tool_idea_vote(p_idea_id uuid, p_install_id text)
RETURNS TABLE(upvotes bigint, has_upvoted boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea_status text; voter text;
BEGIN
    voter := CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text
        WHEN nullif(btrim(p_install_id), '') IS NOT NULL THEN 'install:' || p_install_id ELSE NULL END;
    IF voter IS NULL THEN
        RAISE EXCEPTION 'Sign in or provide an installation ID to remove a vote' USING ERRCODE = '22023';
    END IF;
    SELECT i.status INTO idea_status FROM public.tool_ideas i WHERE i.id = p_idea_id FOR SHARE;
    IF idea_status IS NULL OR idea_status NOT IN ('open', 'under_review', 'planned', 'in_progress') THEN
        RAISE EXCEPTION 'Votes cannot be changed for this idea' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id AND v.voter_id = voter;
    RETURN QUERY SELECT count(*), EXISTS (
        SELECT 1 FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id AND v.voter_id = voter
    ) FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id;
END $$;
CREATE OR REPLACE FUNCTION public.validate_idea_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea_status text;
BEGIN
    SELECT status INTO idea_status FROM public.tool_ideas WHERE id = NEW.idea_id FOR SHARE;
    IF idea_status IS NULL OR idea_status NOT IN ('open', 'under_review', 'planned', 'in_progress') THEN
        RAISE EXCEPTION 'This idea is not accepting votes' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.is_idea_repository_url(text), public.prepare_idea_submission(),
    public.validate_idea_claim(), public.record_idea_review(), public.validate_idea_vote() FROM PUBLIC, anon, authenticated;
-- CHECK constraints are evaluated for ordinary client submissions too.
GRANT EXECUTE ON FUNCTION public.is_idea_repository_url(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_ideas_with_claims(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ideas_with_claims(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_tool_idea(uuid,text),
    public.review_idea_with_claim(uuid,timestamptz,text,text,text,uuid,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_tool_idea(uuid,text),
    public.review_idea_with_claim(uuid,timestamptz,text,text,text,uuid,text,text,boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
