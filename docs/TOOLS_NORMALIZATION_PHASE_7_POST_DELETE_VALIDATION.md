# Phase 7: Post-deletion acceptance

Do not declare the migration complete until the read-only checks and controlled production smoke tests pass. Finalize the expected column set in the SQL script when Phase 6's exact drop list is approved.

## Manual actions

1. Run `scripts/tools-normalization/13_post_contract_checks.sql`. Its missing-current-release, excessive-release and feature/verification discrepancy queries must return no rows. Confirm the view count matches tools and that only the agreed legacy columns disappeared. Verify the old sync trigger is gone but the new normalized publish path works.
2. Check real anon/auth read permissions and denied writes using client tokens, plus tool visibility. Check list/detail APIs, OData data and metadata, public filters, intake, conversion and tool update through a designated test tool.
3. Run supported desktop and VS Code builds against the chosen project and test list/install/update. Publish one designated test-tool release through the live workflow and re-run the read-only checks. Monitor request errors and failed jobs for the agreed observation window, then record sign-off.
4. On failure, stop affected writes. Restore from the rehearsed backup/PITR into an isolated project and reconcile changes made since the backup before any production restore. Recreating columns alone does not restore their values.
