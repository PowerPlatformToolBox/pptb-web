-- Run as database owner AFTER the ideas/claiming migrations.
-- Permanently deletes idea audit history, not ideas, votes, or claims.
-- Safe to reapply. Back up history first if you might need it later.
BEGIN;

LOCK TABLE public.tool_ideas IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION public.review_idea_with_claim(
    p_id uuid, p_expected_updated_at timestamptz, p_status text, p_resolution text,
    p_public_note text, p_duplicate_of uuid, p_github_issue_url text,
    p_repository_url text, p_release_claim boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea public.tool_ideas;
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
        IF NOT p_release_claim THEN
            IF NOT public.is_idea_repository_url(p_repository_url) THEN
                RAISE EXCEPTION 'A valid repository URL is required' USING ERRCODE = '22023';
            END IF;
            UPDATE public.idea_claims SET repository_url = p_repository_url WHERE id = idea.claim_id;
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

REVOKE ALL ON FUNCTION public.review_idea_with_claim(uuid,timestamptz,text,text,text,uuid,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_idea_with_claim(uuid,timestamptz,text,text,text,uuid,text,text,boolean) TO authenticated;

DROP TRIGGER IF EXISTS record_idea_review ON public.tool_ideas;
DROP FUNCTION IF EXISTS public.record_idea_review();
DROP TABLE IF EXISTS public.idea_review_history;

NOTIFY pgrst, 'reload schema';
COMMIT;
