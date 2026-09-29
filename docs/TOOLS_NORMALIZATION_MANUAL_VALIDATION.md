# Manual validation without Docker

Use Supabase dashboard/SQL editor and the deployed web app; staging is optional. Never point automated destructive tests at user-owned tools. Keep service-role credentials on the server, not in desktop or VS Code client builds.

## After additive migration

1. Take and verify a database backup. Execute the ordered Phase 1 SQL files in the Supabase editor, following `TOOLS_NORMALIZATION_PHASE_1.md`. Run `07_phase1_checks.sql` until the backfill count is zero and discrepancy result sets are empty.
2. Select a designated test tool or test npm package. Check same-version update and new-version update. If publishing four releases, use only this isolated package and check that its current release and two most recent others remain.
3. Submit a package without config, one with `agents` missing `headless`, one with malformed config, and one with `agents.headless: true`. The two invalid configs must fail validation without creating or updating the tool; the true case must store `mcpEnabled`. Update a test package from true to false and verify the new release is not marked MCP Enabled.
4. With real anon and authenticated sessions, read active releases, features and the view; attempt a denied write using a dedicated test identity. The SQL editor and service-role key cannot validate client RLS.
5. Check `/api/tools`, tool detail, `/api/odata/tools`, `/api/odata/$metadata`, and the public tools filters at mobile and desktop widths. Launch locally built desktop and VS Code clients against the same chosen Supabase project and verify list/install/update/verified/MCP behavior.

## Before and after deletion

1. Phase 5: follow `TOOLS_NORMALIZATION_PHASE_5_PRE_DELETE_VALIDATION.md`. Do not delete columns without all client-owner sign-offs and a verified pre-drop backup/PITR restore rehearsal.
2. Phase 7: after any approved contract migration, follow `TOOLS_NORMALIZATION_PHASE_7_POST_DELETE_VALIDATION.md` before declaring completion. Record screenshots or results and monitor application errors for the agreed observation window.

Run `npm run lint`, `npx tsc --noEmit` and `npm run build` locally for web changes. SQL scripts must be executed manually in your Supabase project; this repository does not have a local PostgreSQL client or database configured for SQL runtime tests.
