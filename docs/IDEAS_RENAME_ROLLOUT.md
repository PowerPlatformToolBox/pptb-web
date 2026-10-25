# Rename Tool Ideas storage to Ideas

## Required Supabase scripts

This is a **breaking change**, approved for a coordinated website/desktop update.
Existing data is renamed in place, not copied or deleted. No compatibility views
or RPC aliases are created. The public label **Tool Ideas** still describes the
`tool` category; only generic storage/contracts lose the misleading tool prefix.

If the combined Ideas/claiming migrations and notification/history cleanups are
already applied, run only:

1. [ideas-rename.sql](./sql/ideas-rename.sql)
2. [ideas-rename-verification.sql](./sql/ideas-rename-verification.sql) (read-only)

Use the Supabase SQL editor as database owner. Back up first, test on staging,
and compare idea/vote/claim/intake counts before and after. The migration is
transactional and safe to reapply. It takes exclusive locks; schedule a quiet
window. Do not rerun earlier migration/cleanup scripts after this rename:
they reference the old names. On a fresh environment, apply the historical
migrations and cleanups first, then this rename last.

The migration preserves table grants, RLS policies, data, foreign keys, function
permissions, and tool-only intake/claim eligibility. It does not recreate the
removed notification or review-history tables.

## Contract changes

| Before | After |
| --- | --- |
| `tool_ideas` | `ideas` |
| `tool_idea_votes` | `idea_votes` |
| `tool_intakes.tool_idea_id` | `tool_intakes.idea_id` |
| `tool_intakes_tool_idea_id_fkey` | `tool_intakes_idea_id_fkey` |
| `upvote_tool_idea(uuid,text)` | `upvote_idea(uuid,text)` |
| `remove_tool_idea_vote(uuid,text)` | `remove_idea_vote(uuid,text)` |
| `claim_tool_idea(uuid,text)` | `claim_idea(uuid,text)` |
| `get_tool_ideas(text)` | `get_open_tool_ideas(text)` |
| `validate_tool_intake_idea()` / trigger | `validate_intake_idea()` / trigger |
| Tool submission JSON `toolIdeaId` | `ideaId` |
| Dashboard JSON `toolIdeas`, `toolIdeasError` | `ideas`, `ideasError` |
| Intake embedded response `tool_idea` | `idea` |

`get_open_tool_ideas` intentionally remains a Tool Ideas-only, open-only helper
with the existing six-column result; its name now makes that scope explicit.
It is not the combined board API. Use `get_ideas_with_claims` for all types/statuses.

`get_ideas`, `get_ideas_with_claims`, `review_idea`, and
`review_idea_with_claim` retain their signatures. Vote/claim parameters and result
shapes also stay the same; only their function names change.
The category key `tool`, Tool Ideas labels, and the permanent `/tool-ideas`
redirect remain valid. PPTB Desktop/VSCode ideas are still not claimable.

## Function-body updates

PostgreSQL updates catalog-based references on a table/column rename, but not
SQL/PLpgSQL source strings or JSON keys. The script updates public SQL/PLpgSQL
functions containing exact obsolete identifier tokens, including any deployed
intake resubmission functions that read `p_values ->> 'tool_idea_id'`.
Function signatures, ownership, security attributes, search paths and ACLs
are retained; the verification script reports any stale function sources.

Inspect custom views, external jobs, Edge Functions, exports, generated types,
and integrations outside this repository for old names too. A view's dependency
can remain valid while its exposed output alias still uses an old column name.
The script does not guess at or rename arbitrary external contracts.

## Deployment sequence

1. Prepare website and desktop changes before the cutover.
2. Apply the Supabase rename during a coordinated maintenance window.
3. Run verification: all permission flags true, no stale function rows, and
   unchanged data counts.
4. Deploy the renamed website and desktop together. Older clients calling the
   removed table/RPC names will fail; no fallback is provided.
5. Smoke-test new idea submission for each type, add/remove votes, claim and
   release, dashboard progress, and tool submission/resubmission/admin intake
   links. Confirm Desktop/VSCode ideas cannot be claimed or linked to intakes.

For the external desktop change, use the updated
[desktop implementation prompt](./IDEAS_DESKTOP_PROMPT.md).
Discord's `idea.claimed` event and email payloads do not change.

## Local validation

The database tests build the old schema, apply all preceding migrations/cleanups,
then apply the rename twice. They check data preservation, grants, RLS, claim
idempotency/conflicts, creator linkage, votes, releases, reviews, public reads,
intake FK/trigger behavior, and rewriting JSON keys in function bodies.

```sh
node --test tests/ideas-database.test.mjs tests/ideas.test.mjs \
  tests/idea-claiming.test.mjs tests/idea-claiming-ui.test.mjs \
  tests/discord-notify.test.mjs tests/submit-tool.test.mjs
npx tsc --noEmit --incremental false
npm run build
```
