-- For databases that already applied the original claiming migration.
-- Removes notification delivery records only, preserving claims and history.
-- Deploy the direct-send application code together with this change.
BEGIN;

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

REVOKE ALL ON FUNCTION public.claim_tool_idea(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_tool_idea(uuid,text) TO authenticated;
DROP FUNCTION IF EXISTS public.take_idea_claim_notifications(integer,uuid);
DROP TABLE IF EXISTS public.idea_claim_notifications;
NOTIFY pgrst, 'reload schema';
COMMIT;
