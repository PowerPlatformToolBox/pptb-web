# Phase 2: MCP intake and publishing

This phase uses `@pptb/validate` 1.0.3, which requires `agents.headless` to be a boolean whenever `agents` is present. It does not require an `agents` section when the config is absent or contains only other sections. Intake and updates reject invalid config rather than treating it as a warning.

## Manual actions

1. Apply the Phase 1 SQL and run its checks before deploying these API changes. The code requires `tool_intakes.mcp_enabled`, `tools.current_release_id`, and `tool_release_features`.
2. Prepare npm test packages: no config file; valid config with no `agents`; config with `agents` and no `headless` (must fail); config with `agents.headless: true`; malformed JSON (must fail). Also prepare a subsequent release that turns headless from true to false.
3. After Phase 1 SQL has passed, submit and convert the test packages via the existing admin workflow. Confirm that only the true case has a `tool_release_features` row with `feature_key = 'mcpEnabled'`, and that false removes the flag for the new release. No config text should be stored in either `tool_intakes` or `tool_releases`.
4. Check that missing config does not block intake, while invalid JSON or any error from `validatePPTBConfig` returns HTTP 400 before intake/published-tool changes. Workflow retries must not silently lose an MCP flag.

Run `node --experimental-strip-types --test tests/version-extraction.test.mjs` for the validator's focused behavior checks. A real npm tarball and Supabase conversion still need manual validation.
