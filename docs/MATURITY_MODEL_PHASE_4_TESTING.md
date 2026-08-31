# Tool Maturity Model: Phase 4 Local Testing

## Marketplace API

1. Set one active tool to `verified` and another to `unverified` in `tool_maturity`.
2. Request `/api/tools`.
3. Confirm every record contains `tool_maturity.status`, defaulting to `unverified` when no maturity row exists.
4. Confirm verified tools appear first and names remain alphabetical within the verified and unverified groups.

## Marketplace listing

1. Open `/tools` on desktop and mobile widths.
2. Confirm verified cards have a checkmark and **Verified** label in the tag row.
3. Confirm unverified cards have no verification badge.
4. Confirm verified cards are listed first and card content does not overlap or resize unexpectedly.

## Desktop OData contract

1. Request `/api/odata/$metadata` and confirm `PPTB.ToolMaturity` and the `tool_maturity` property are declared.
2. Request `/api/odata/tools` and confirm each item contains `tool_maturity.status` with the same value and verified-first ordering as `/api/tools`.

## Governance reflection

Change a verified tool back to `unverified` directly, representing a write by the external tool-management governance job. Refresh `/tools` and both APIs. The badge must disappear and the tool must return to the unverified sort group without any web-repo job running.
