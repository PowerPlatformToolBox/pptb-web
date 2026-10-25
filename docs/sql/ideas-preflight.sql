-- Read-only. Save these counts before applying ideas-migration.sql.
SELECT 'ideas' AS entity, count(*) AS row_count FROM public.tool_ideas
UNION ALL SELECT 'votes', count(*) FROM public.tool_idea_votes
UNION ALL SELECT 'linked_intakes', count(*) FROM public.tool_intakes WHERE tool_idea_id IS NOT NULL;

SELECT status, count(*) AS idea_count FROM public.tool_ideas GROUP BY status ORDER BY status;
-- The supplied database has only 'open'. Stop if other statuses appear; do not silently map them.

SELECT p.oid::regprocedure AS signature, pg_get_function_result(p.oid) AS result_shape,
    p.prosecdef AS security_definer, p.proconfig AS settings, p.proacl AS grants
FROM pg_proc p
WHERE p.oid IN (
    'public.get_tool_ideas(text)'::regprocedure,
    'public.upvote_tool_idea(uuid,text)'::regprocedure
);

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('tool_ideas', 'tool_idea_votes', 'user_roles');

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tool_ideas'
    AND column_name IN ('idea_type', 'resolution', 'public_note', 'duplicate_of', 'github_issue_url', 'updated_at', 'updated_by');
-- Expect zero rows: this migration is one-time, not a rerunnable script.
