-- Read-only. Compare counts with the saved preflight results immediately after migration.
SELECT 'ideas' AS entity, count(*) AS row_count FROM public.tool_ideas
UNION ALL SELECT 'votes', count(*) FROM public.tool_idea_votes
UNION ALL SELECT 'linked_intakes', count(*) FROM public.tool_intakes WHERE tool_idea_id IS NOT NULL;

SELECT idea_type, status, count(*) AS idea_count FROM public.tool_ideas GROUP BY idea_type, status;
-- Immediately after migration, all pre-existing ideas should be tool/open.

SELECT * FROM public.get_tool_ideas('migration-verification');
SELECT * FROM public.get_ideas('');
-- Legacy result: six columns, only open Tool Ideas. Combined result: all types/statuses,
-- no email/install_id/app_version/updated_by.

SELECT
    has_function_privilege('anon', 'public.get_ideas(text)', 'EXECUTE') AS public_board_readable,
    has_function_privilege('authenticated', 'public.review_idea(uuid,timestamptz,text,text,text,uuid,text)', 'EXECUTE') AS signed_in_rpc_available,
    NOT has_function_privilege('anon', 'public.review_idea(uuid,timestamptz,text,text,text,uuid,text)', 'EXECUTE') AS anonymous_review_blocked,
    NOT has_table_privilege('anon', 'public.tool_ideas', 'TRUNCATE') AS anonymous_truncate_blocked,
    NOT has_table_privilege('authenticated', 'public.tool_idea_votes', 'TRUNCATE') AS signed_in_truncate_blocked;
-- Expect all true. Signed-in RPC availability does NOT grant review permission:
-- review_idea separately checks auth.uid() and the admin role.

SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'public.tool_ideas'::regclass AND conname LIKE 'ideas_%';
-- Expect every constraint to be validated.

SELECT count(*) AS invalid_tool_links
FROM public.tool_intakes t JOIN public.tool_ideas i ON i.id = t.tool_idea_id
WHERE i.idea_type <> 'tool';
-- Expect zero.

SELECT count(*) AS review_history_count FROM public.idea_review_history;
-- Expect zero initially; review operations will append records.
