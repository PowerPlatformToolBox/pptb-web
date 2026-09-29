# Phase 3: Catalog API and public tools filters

Deploy only after Phase 1 backfill and access checks pass. The API list and detail routes continue to query `tools` for analytics, categories and contributors, then fetch MCP and feature fields from `tools_catalog` by tool ID. OData properties are additive.

## Manual checks

1. For an existing Phase 1 database, apply `scripts/tools-normalization/09a_release_media.sql` then `09_replace_catalog_view.sql`; verify its typed fields and anon/auth read grants before deploying this web code. Open `/api/tools` and `/api/tools/{id}` for a tool with analytics, categories and contributors. Confirm that the existing fields remain and that current-release `icon`, `download`, `multi_connection`, `enabled_for_power_platform_api`, `mcp_enabled` and `published_at` (list) are present. The catalog view has no `features` JSONB field.
2. Open `/api/odata/tools` and `/api/odata/$metadata`. Confirm that `McpEnabled`, `MultiConnection`, `ConnectionRequirement` and `EnabledForPowerPlatformAPI` match the declared types and that older fields still parse in the desktop app.
3. On `/tools`, exercise search, category, MCP, Verified, Power Platform API, multi-connection and sorting controls, then reload or share the resulting URL. Test clear-all and the empty state at narrow and wide widths. Confirm the MCP badge also appears on tool detail.
4. Verify tools with no release or no MCP row are shown as MCP disabled, and that updates to current release change the filters. Test with a real database after the Phase 1 migration; the mock mode only validates presentation.

The local Next.js build and TypeScript checks pass; database-backed responses still require your manual verification.
