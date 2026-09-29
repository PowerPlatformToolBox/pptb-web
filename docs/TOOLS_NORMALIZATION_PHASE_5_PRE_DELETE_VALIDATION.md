# Phase 5: Pre-deletion acceptance

This is a hard no-go gate, not an automatic approval. Run it only after Phase 4 has migrated the web writer, tool-management workflows, desktop app and VS Code extension. No old columns are dropped by these checks.

## Manual actions

1. Run `scripts/tools-normalization/10_preflight_checks.sql` in the Supabase SQL editor. Tool and catalog counts must match, `missing_current_release` must be zero, and discrepancy result sets must be empty. Investigate reported views/functions and inspect constraints, triggers, REST clients and app source for old-column dependencies. The last two queries are leads, not proof that all dependencies are gone.
2. Test authenticated and anon SELECT and denied writes using actual client credentials; the SQL editor and service role bypass RLS. Confirm active/inactive visibility, verification status, package feature values and true/false MCP values.
3. Manually check `/api/tools` list/detail, `/api/odata/tools` and `/api/odata/$metadata`, public filters, admin intake, conversion, update and retry behavior with representative analytics/categories/contributors. Run supported desktop and VS Code builds locally against the chosen project; test list, install and update. Verify one genuine workflow publish.
4. Get explicit sign-off from each external app owner that all still-supported installed versions can operate without every planned legacy column (or enforce an upgrade). Inspect telemetry for old REST queries and ensure the web writer and workflows no longer write old fields. SQL cannot see external consumers.
5. Verify a fresh production backup and practice restoring it to an isolated project. Coordinate a short change window, freeze or coordinate writes, then rerun the preflight immediately before any Phase 6 command.

Any mismatch, remaining reader/writer, missing restore capability or untested supported client is a **no-go**. Do not run a drop script or `CASCADE` to bypass it.
