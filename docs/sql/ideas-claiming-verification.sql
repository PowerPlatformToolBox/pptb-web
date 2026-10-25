-- Read-only. Run after ideas-claiming.sql. All permission flags should be true.
SELECT
    has_function_privilege('anon', 'public.get_ideas_with_claims(text)', 'EXECUTE') AS public_board_readable,
    NOT has_function_privilege('anon', 'public.claim_tool_idea(uuid,text)', 'EXECUTE') AS anonymous_claim_blocked,
    has_function_privilege('authenticated', 'public.claim_tool_idea(uuid,text)', 'EXECUTE') AS signed_in_claim_available,
    NOT has_table_privilege('authenticated', 'public.idea_claims', 'UPDATE') AS client_claim_update_blocked;

-- Expect zero invalid ownership references and zero in-progress non-Tool Ideas.
SELECT count(*) AS invalid_claims
FROM public.tool_ideas i LEFT JOIN public.idea_claims c ON c.id = i.claim_id
WHERE (i.claim_id IS NOT NULL AND (c.id IS NULL OR c.idea_id <> i.id OR c.released_at IS NOT NULL))
   OR (i.status = 'in_progress' AND (i.idea_type <> 'tool' OR i.claim_id IS NULL));

SELECT idea_type, status, count(*) FROM public.tool_ideas GROUP BY idea_type, status;
SELECT * FROM public.get_ideas_with_claims('');
-- No creator IDs, claimant account IDs, email, installation ID, or app version.
SELECT * FROM public.get_tool_ideas('claiming-verification');
-- Unchanged six-column shape; only open Tool Ideas.
