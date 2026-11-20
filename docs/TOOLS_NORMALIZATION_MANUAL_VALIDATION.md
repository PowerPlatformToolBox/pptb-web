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

## Version-pinned intake conversion

Pause intake conversions during rollout. Apply the [versioned intake migration](../supabase/migrations/20261120043100_versioned_tool_intake.sql) to staging (after `resubmit_tool_intake` and `publish_tool_release` are installed), then deploy the companion `tool-management` conversion workflow to `main` and deploy the web app. Roll out to production in the same order after validation.

1. Submit a test package at `1.1.0`, publish `1.2.0` to npm, then open the intake. The panel should show both versions. **Convert approved 1.1.0** must list only `1.1.0`; also verify its approved categories, contributor links, and MCP flag.
2. With a separate intake, use **Review 1.2.0**. Verify that it preserves categories and the linked idea, reloads manifest metadata and contributors from `1.2.0`, saves the previous decision in **Previous reviews**, and requires a fresh approval. A stale browser tab must not be able to approve or publish the replaced version.
3. If the approved version is unavailable, conversion must stop before publishing and must not use `latest`. Simulate a lost response after publishing: retry must use the recorded release ID without publishing again. Verify that a different current release causes a conflict, not a rollback.
4. An intake affected by the previous workflow may already have a listing but no conversion receipt. Check the listing manually; if its current release was not approved, make it unavailable pending review and reconcile the existing listing before retrying. Do not fabricate a receipt or rerun conversion over the existing listing.
