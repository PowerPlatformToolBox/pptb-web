-- Apply after ideas-migration.sql, before deploying vote removal.
-- Safe to reapply. Existing vote/add/list contracts are unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION public.remove_tool_idea_vote(p_idea_id uuid, p_install_id text)
RETURNS TABLE(upvotes bigint, has_upvoted boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    idea_status text;
    voter text;
BEGIN
    voter := CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text
        WHEN nullif(btrim(p_install_id), '') IS NOT NULL THEN 'install:' || p_install_id ELSE NULL END;
    IF voter IS NULL THEN
        RAISE EXCEPTION 'Sign in or provide an installation ID to remove a vote' USING ERRCODE = '22023';
    END IF;
    -- Match vote creation's lock so a concurrent review cannot close the idea mid-action.
    SELECT i.status INTO idea_status FROM public.tool_ideas i WHERE i.id = p_idea_id FOR SHARE;
    IF idea_status IS NULL OR idea_status NOT IN ('open', 'under_review', 'planned') THEN
        RAISE EXCEPTION 'Votes cannot be changed for this idea' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id AND v.voter_id = voter;
    RETURN QUERY SELECT count(*), EXISTS (
        SELECT 1 FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id AND v.voter_id = voter
    ) FROM public.tool_idea_votes v WHERE v.idea_id = p_idea_id;
END $$;

REVOKE ALL ON FUNCTION public.remove_tool_idea_vote(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_tool_idea_vote(uuid, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
