# Phase 1: Additive tools schema

No legacy columns are removed in this phase. Do not deploy application changes until the backfill and verification are complete. This guide uses the Supabase SQL editor; no Docker or local database is required.

## Manual actions

1. Confirm that your project uses PostgreSQL 15 or later for the `security_invoker` view. Confirm the existing `public.tools` and `public.tool_maturity` schemas and RLS policies match the application's expectations. Take a restorable backup before applying SQL. Do not paste production credentials into source control.
2. Run the SQL in `scripts/tools-normalization/01_tables.sql`, then `02_seed_feature_definitions.sql`, then `03_triggers.sql` in the Supabase SQL editor. Execute one script at a time as an administrative role; stop on any error. This installs synchronization before backfill so concurrent tool writes are captured.
3. Run `04_backfill.sql` repeatedly until its `remaining_tools_to_backfill` result is zero. Each invocation handles at most 100 tools to limit lock duration. Do not run multiple backfill sessions concurrently.
4. Run `05_views.sql`, then `06_grants_rls.sql`, then `07_phase1_checks.sql`. The tools and catalog counts must match, `missing_current_release` must be zero, and every subsequent result set must be empty. Resolve any mismatch before continuing.
   If the only mismatches are legacy `features.minAPI` values where both `legacy_min_api` and `release_min_api` are null, run `08_repair_min_api.sql` once in the SQL editor, then rerun `07_phase1_checks.sql`. This repairs the current release without rewriting `tools` or removing old releases, and updates the sync function so future legacy writes retain the same value. Do not use it to mask any other mismatch; investigate remaining rows separately.
   On an already-installed Phase 1 database, run `09a_release_media.sql` once, followed by `09_replace_catalog_view.sql`, before running the updated `07_phase1_checks.sql` or deploying updated web code. The first script renames the existing release download column, adds a release icon, refreshes current-release media from `tools.download` and `tools.icon`, and updates the sync trigger. The second replaces the catalog view with typed feature columns and release-owned `download`/`icon`. Both are transactional and have no `CASCADE`; investigate any dependency or lock error before retrying. Do not rerun the original table-creation scripts.
5. Test the existing public tools list, a tool detail page, and the OData feed. Test one controlled update of a designated test tool and re-run `07_phase1_checks.sql`. Verify the old columns remain populated. Do not publish four test versions against a real user tool.
6. Test with a real anon key and authenticated token: active releases/features and the view are readable, inactive tools are not exposed, and inserts/updates into the new tables are denied. Supabase's SQL editor and service-role key bypass normal client RLS checks; use an actual client request to verify client access.

## Ownership and limits

- The database trigger mirrors legacy `tools` writes and keeps at most three releases per tool: the current release and the two most recently published others. Backfill creates only the current release; it cannot recreate historical versions.
- The full `pptb.config.json` is never stored. Existing tools are not retroactively marked MCP Enabled; this requires future intake/update or a separately approved package scan.
- Only the current release's download and icon can be reliably recovered from `tools.download` and `tools.icon`. Earlier releases retain their existing download values under the renamed column, but those values came from `tools.downloadurl` and may be incorrect; their icons remain null until a trusted version-specific source is used. Do not infer historical media from the current tool.
- If a script fails, stop and inspect the SQL editor error. Do not run a destructive rollback against production without reviewing data written since migration began. No SQL syntax or runtime validation has been performed against this project's Supabase instance yet.
- Phase 2 uses published `@pptb/validate` 1.0.3, in which `AgentsConfig.headless` is required whenever `agents` is present.
