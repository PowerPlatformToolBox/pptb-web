-- Read-only. Run after ideas-rename.sql. All flags should be true.
SELECT
    to_regclass('public.ideas') IS NOT NULL AS ideas_present,
    to_regclass('public.idea_votes') IS NOT NULL AS votes_present,
    to_regclass('public.tool_ideas') IS NULL AS old_ideas_absent,
    to_regclass('public.tool_idea_votes') IS NULL AS old_votes_absent,
    to_regprocedure('public.upvote_idea(uuid,text)') IS NOT NULL AS vote_rpc_present,
    to_regprocedure('public.remove_idea_vote(uuid,text)') IS NOT NULL AS remove_rpc_present,
    to_regprocedure('public.claim_idea(uuid,text)') IS NOT NULL AS claim_rpc_present,
    to_regprocedure('public.claim_tool_idea(uuid,text)') IS NULL AS old_claim_rpc_absent,
    has_function_privilege('authenticated','public.claim_idea(uuid,text)','EXECUTE') AS signed_in_claim_available,
    NOT has_function_privilege('anon','public.claim_idea(uuid,text)','EXECUTE') AS anonymous_claim_blocked;

SELECT 'ideas' AS entity, count(*) FROM public.ideas
UNION ALL SELECT 'votes', count(*) FROM public.idea_votes
UNION ALL SELECT 'claims', count(*) FROM public.idea_claims
UNION ALL SELECT 'linked_intakes', count(*) FROM public.tool_intakes WHERE idea_id IS NOT NULL;

-- Expect zero rows: no SQL/PLpgSQL function bodies with obsolete identifiers.
SELECT p.oid::regprocedure AS stale_function
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND p.prosrc ~ '\m(tool_ideas|tool_idea_votes|tool_idea_id|get_tool_ideas|upvote_tool_idea|remove_tool_idea_vote|claim_tool_idea|validate_tool_intake_idea)\M';

SELECT * FROM public.get_ideas_with_claims('');
