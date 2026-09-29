# Phase 6: Contract and column deletion

**Not ready to execute.** The tools table currently feeds the web update route and external workflows/clients. Prepare `11_remove_sync_trigger.sql` and `12_drop_legacy_columns.sql` only after Phase 5 has passed and all surviving column consumers and database dependencies have been identified. No destructive SQL is shipped at this stage.

## Manual actions

1. Obtain Phase 5 sign-offs, a restorable backup/PITR point and a restore rehearsal. Record the exact columns to drop and the matching release/feature or identity replacements. Include every affected view, function, policy and API route in the review.
2. Move all writers, including `/api/update-tool`, to an atomic normalized write before removing the sync trigger. Otherwise a successful workflow can silently leave the current release stale.
3. Generate and review the contract scripts against the then-current production schema. Require a bounded lock timeout, explicit dependency guards and a transaction; do not use `CASCADE`. Replace `tools_catalog` definitions that still read old columns before dropping them.
4. Run in the coordinated change window, stop on the first failed guard, and proceed directly to Phase 7 validation. Do not assume an automatic SQL rollback can restore dropped values.

The latest-three-release retention and MCP feature rows remain in place. Additional historical releases and dropped-column values cannot be reconstructed from a rollback script unless preserved in a tested backup.
