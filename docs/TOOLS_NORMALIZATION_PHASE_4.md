# Phase 4: External client and writer migration

Do not drop old `public.tools` columns until all three migrations below are deployed and their supported versions are verified. The web app's `/api/update-tool` legacy-column writer must also be migrated in this phase after Phase 2 is implemented. SQL cannot identify clients using columns via the REST API; collect client-owner sign-off.

## Desktop app Copilot prompt

> Inspect every Supabase/OData read of `public.tools` in this desktop app. The web backend now has `public.tools_catalog`: current-release `download`, `icon`, `readme_url`, version/license/CSP/min/max API/published date, typed `multi_connection`, `connection_requirement`, `enabled_for_power_platform_api`, `mcp_enabled`, and `maturity_status`. There is no `features` JSONB column on the view. `tool_release_features` contains the per-release source values. The `tools` table retains legacy columns only during migration. Update reads to the new contract without breaking installed clients, their tool install/update flows or their verified display. Determine whether this app reads Supabase directly or through OData, and update only the actual path. Preserve compatibility with deployed servers lacking new OData fields during rollout. Add focused tests for release metadata, MCP false/true and missing values, typed feature fields, verified status, and install/update; report every legacy column still used. Do not expose a service-role key in the app.

## VS Code extension Copilot prompt

> Inspect how this extension loads tools, categories, release metadata, download URLs and verified status. Migrate reads of versioned `public.tools` fields to `public.tools_catalog` or the updated OData contract as appropriate. Consume current-release `download`/`icon`, typed `multi_connection`, `connection_requirement`, `enabled_for_power_platform_api`, `mcp_enabled`, and `maturity_status` without mistaking them for invocation capabilities; the catalog view has no `features` JSONB column. Preserve install/update behavior and a fallback for older server deployments during rollout. Add tests for absent/true MCP, metadata and filtering, list/detail, installation, and updates. Report which old `tools` columns and API fields every supported extension version still requires. Use only anon/auth credentials in client code.

## Tool-management Copilot prompt

> Inspect `convert-tool.yml`, `update-convert-tool.yml` and their scripts for every write to `public.tools`. After the web's additive migration, releases live in `tool_releases` (unique tool_id/version, at most three including current) and package features in `tool_release_features` with definitions in `tool_feature_definitions`; `tools.current_release_id` identifies the published release. Use the actual npm/artifact `download` and `icon` values per version, not `downloadurl` or `iconurl`. During legacy dual writes set `tools.download` and `tools.icon`, since the transition trigger mirrors those fields. Implement atomic, idempotent writes of tool identity, release metadata, package features and current pointer, ideally through a restricted database transaction/RPC, keeping legacy writes during the transition. Never overwrite the separate `mcpEnabled` feature written by web intake/update. Test new tool, same-version retry, update to a new version (including changed icon), concurrent updates, null feature values, and four versions (only three retained). Inventory all legacy columns touched before recommending their removal. Do not drop existing columns or change production secrets in this PR.

## Manual actions

1. Run these prompts in their respective repositories; review and deploy their changes in a controlled order. Update the web writer after confirming the final workflow contract.
2. Test locally running desktop and VS Code builds against the chosen project with anon/auth credentials; test older versions you still support or enforce upgrades before Phase 5.
3. Keep the legacy sync trigger and columns active during rollout. Record the versions deployed, test results, and remaining old-column dependencies for the pre-deletion gate.
