# Tool Maturity Model: Phase 3 Local Testing

## FIFO and claim-on-open

1. Create at least two queued requests with different `submitted_at` values.
2. Sign in as an admin and open `/admin/verification-requests`.
3. Confirm the oldest request is first.
4. Open it and confirm it immediately changes to `in_review` with `reviewed_by` set to the current admin. There must be no separate claim action.
5. Attempt to open it as a second admin. Expect a conflict and no reviewer change.

## Checklist thresholds

Confirm all 13 seeded criteria appear in `sort_order`, each with Pass, Not pass, and a comment field. The required/optional labels must not be editable.

For bug health, confirm the UI states:

- Pass: fewer than 5 open bugs and all first maintainer responses within 10 days.
- Flag: 5 or more open bugs, or a first response later than 10 days; reviewer judgment applies.
- Blocker: any bug without a maintainer response after 30 days.
- Time is measured from issue creation to first maintainer response, not closure.

For usage, verify the displayed MAU, downloads, and count of reviews rated 3+ against Supabase. Two of `MAU >= 10`, `downloads >= 50`, and `reviews rated 3+ >= 1` must pass. A waiver is accepted only when every other criterion passes and all three usage values are zero.

## Mixed pass/fail rejection

1. Mark a mixture of criteria Pass and Not pass, including at least two required failures and one optional failure.
2. Confirm **Approve** is disabled and **Reject** is enabled only after all 13 criteria are evaluated.
3. Reject and verify all 13 checklist rows are stored and the request becomes `rejected` with `decided_at` set.
4. Confirm no Verified maturity row is granted.
5. Confirm the rejection email lists every failed required criterion and does not list the failed optional criterion.

## Approval

1. Open a new request and mark every required criterion Pass. Optional criteria may be Not pass.
2. Confirm **Reject** is disabled and **Approve** is enabled.
3. Approve and verify the request becomes `approved`.
4. Verify `tool_maturity.status = 'verified'`, `verified_request_id` references the request, `last_change_reason = 'initial_approval'`, and the current `csp_exceptions` value is stored in `verified_csp_exceptions_snapshot`.
5. Confirm the approval email names the tool and says its marketplace Verified badge is active.

There is no changes-requested, conditional, or partial-approval action.
