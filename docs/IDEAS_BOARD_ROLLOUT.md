# Combined Ideas board rollout

This guide describes the historical baseline. The current website additionally
requires the [breaking generic Ideas rename](./IDEAS_RENAME_ROLLOUT.md), applied
after claiming and its cleanups. Do not run baseline scripts after the rename.

For Tool Idea reservations and the new In progress status, apply the subsequent
[claiming rollout](./IDEAS_CLAIMING_ROLLOUT.md) after this baseline. That guide
includes the Supabase migration order and Discord receiver integration prompt.

## Scope

The public board is `/ideas`; `/tool-ideas` permanently redirects to it.
Types are `pptb_desktop`, `pptb_vscode`, and `tool`. The default list combines all
types and statuses, ordered by votes descending and creation date descending.
Type and status filters can be combined.

Status values are `open`, `under_review`, `planned`, `closed`, and `duplicate`.
Closed ideas require a public explanation and one resolution: `implemented`,
`not_planned`, `out_of_scope`, or `withdrawn`. Duplicate ideas require an original
idea; self-references and cycles are rejected. Reopening clears the current
resolution/duplicate link, but review history remains.

New votes are accepted only for open, under-review, and planned ideas. Existing
votes can be removed by their voter in those same three statuses. Votes on
closed/duplicate ideas are retained and cannot be changed. Votes are never
transferred or merged.

## Deployment order

1. Back up the database and test on a staging copy first.
2. Run [ideas-preflight.sql](./sql/ideas-preflight.sql) and retain its counts.
   The migration expects the supplied schema and only legacy `open` statuses.
3. Apply [ideas-migration.sql](./sql/ideas-migration.sql) **once** using the
   Supabase SQL editor's database owner role. It is transactional and additive,
   but obtains table locks during the migration; schedule a quiet window.
   It automatically classifies existing ideas as `tool`; no separate backfill
   script is required. It does not delete votes, ideas, or tool-intake links.
4. Run [ideas-verification.sql](./sql/ideas-verification.sql). Compare counts
   before accepting new submissions. PostgREST schema reload is requested by the migration.
5. Apply [ideas-remove-vote.sql](./sql/ideas-remove-vote.sql) to enable vote removal.
   If the original migration has already been applied, run **only this additional
   script**; do not rerun the original migration. The additional script is safe to
   reapply and does not change existing votes or legacy RPC contracts.
6. Deploy the website. The new UI requires the new schema/RPCs; do not deploy it first.
7. Release the desktop update independently using the
   [desktop prompt](./IDEAS_DESKTOP_PROMPT.md).

Nothing in this repository applies SQL automatically or changes the live database.
The desktop repository has not been changed here.

### Backend corrections

Apply [ideas-backend-edits.sql](./sql/ideas-backend-edits.sql) after the original
migration to permit type corrections through the Supabase database editor
(`postgres`) or trusted service-role backend. It is safe to reapply and does not
grant anonymous/authenticated clients direct UPDATE access. The website admin
form continues to manage triage fields, not submission content/type.

Backend edits still enforce valid types/statuses, closed resolutions, duplicate
rules, and matching GitHub repositories. When changing between Desktop and VSCode,
clear or replace the old issue URL in the same update. Before reclassifying a
Tool Idea with linked intakes as a PPTB idea, explicitly unlink/correct those
intakes; the migration does not silently sever existing associations.

History includes type, title, description, and triage changes. Database-editor or
service-role writes without a signed-in app user record a null actor rather than
incorrectly attributing the edit to the previous reviewer. Use Supabase's database
audit facilities to identify the human operator for those privileged edits.

## Legacy compatibility

- Table names and foreign keys are retained. Old inserts that omit `idea_type`
  default to `tool` and retain the existing insert fields.
- `get_tool_ideas(text)` retains its parameter, six-column return type, and
  permissions. It returns **only open Tool Ideas**, so old clients will not
  mislabel PPTB suggestions. As before, an idea disappears from this legacy list
  when its status changes away from `open`.
- `upvote_tool_idea(uuid,text)` retains its signature and two-column result.
  Signed-in identities remain `user:<uuid>`; anonymous desktop identities remain
  `install:<installation-id>`. Repeat votes are idempotent.
- Voting now explicitly rejects closed/duplicate/missing ideas and anonymous
  requests with a blank installation ID. This intentionally replaces the old
  success-shaped response for ineligible ideas. Normal released-client requests
  with a nonempty installation ID continue to work.
- The old website remains compatible during database-first rollout. Tool-only
  links are also enforced by a database trigger.
- Client `TRUNCATE` grants are removed from the idea/vote tables; RLS does not
  protect that operation. Existing client insert/read/vote flows do not need it.

The migration tests reproduce the provided schema and legacy RPC contracts.
Before production rollout, smoke-test the **currently released desktop binary**
against staging, including its handling of a vote after a maintainer closes an
idea. Exact client behavior cannot be guaranteed without its source/binary.

## New RPC contract

`get_ideas(p_install_id text DEFAULT '')` is available to anonymous,
authenticated, and service-role callers. It returns:

```text
id uuid, title text, description text, idea_type text, status text,
resolution text|null, public_note text|null, duplicate_of uuid|null,
github_issue_url text|null, created_at timestamptz, updated_at timestamptz,
upvotes bigint, has_upvoted boolean
```

It never exposes email, installation ID, app version, or reviewer identity.
Anonymous website reads pass an empty installation ID and never match a vote.
Desktop reads pass their existing installation ID.

New submissions still insert into `tool_ideas`, with the existing fields plus an
explicit `idea_type`. New website submissions/votes require sign-in; legacy
desktop installation-based submission/voting is retained.

`remove_tool_idea_vote(p_idea_id uuid, p_install_id text)` returns
`upvotes bigint, has_upvoted boolean`, like vote creation. It resolves the same
signed-in/installation identity and deletes **only that identity's vote**.
Removal is idempotent: removing an absent vote from an eligible idea succeeds
without changing anyone else's vote. Missing ideas, blank anonymous installation
IDs, and closed/duplicate ideas raise explicit errors. New clients must use
separate add/remove calls, not retry a toggle RPC that could invert the intended
state. The UI applies returned counts/state and re-sorts after each action.

## Maintainer workflow

Admins reach `/admin/ideas` through **Manage Ideas** on the dashboard. The page
supports all idea statuses and GitHub link management. It does not change idea
types, authorship, or submission content.

The server checks the bearer token and existing `user_roles` admin membership.
It forwards that user identity to `review_idea`, which independently checks the
admin role. Updates use the exact `updated_at` string as an optimistic concurrency
token; stale reviews return HTTP 409 instead of overwriting another review.

For PPTB ideas, manually create an issue in GitHub or select an existing one,
then paste the canonical URL:

- Desktop: `https://github.com/PowerPlatformToolBox/desktop-app/issues/<number>`
- VSCode: `https://github.com/PowerPlatformToolBox/vscode-extension/issues/<number>`

Remove the URL to unlink an issue. Multiple ideas can share one issue. URL format
and matching repository are enforced in the database. Issue existence is **not**
verified. No GitHub API token, automatic creation, imports, webhooks, or status
sync is involved. GitHub remains authoritative for implementation progress;
board statuses are manually maintained triage summaries.

Review history records the old/new triage fields, actor, and timestamp in
`idea_review_history`. Only admins can read it through RLS. Email and installation
IDs are not copied into history. Prefer the review RPC for triage changes so the
app-user actor is populated correctly; see Backend corrections for direct edits.

## Validation

```sh
node --test tests/ideas.test.mjs tests/ideas-database.test.mjs tests/submit-tool.test.mjs
npx tsc --noEmit --incremental false
```

The database tests use embedded PostgreSQL (PGlite), not a live Supabase instance.
They cover actual SQL migration, constraints, policies, grants, legacy result
shapes, all types, identity formats, review authorization, resolutions,
duplicates/cycles, stale revisions, history, vote preservation, and tool links.
The API tests cover authentication, role failures, validation, RPC arguments,
and error responses.

Staging smoke checks:

- Browse/filter all three types and all statuses, including as a signed-out user.
- Submit each type, then vote as a signed-in user and confirm duplicate votes
  are not counted twice.
- Click your vote again to remove it, then add it back. Confirm the count,
  pressed state, and sort order update. Verify another user's votes are untouched.
- Confirm removal is rejected on closed/duplicate ideas, including through the RPC.
- Confirm My Ideas shows type, status, resolution, maintainer explanation,
  original-idea link, and GitHub link where relevant.
- As an admin, close/reopen an idea, mark a duplicate, and add/remove an issue URL.
- Try a wrong-repository URL, a duplicate cycle, and two stale admin edits.
- Confirm the database blocks votes on closed/duplicate ideas even with an old client.
- Confirm an ordinary user cannot call `review_idea` successfully or write review metadata.
- Confirm a tool submission cannot link to a PPTB idea. Existing linked tool
  intakes remain valid even if their Tool Idea is later closed.
- Test a closure racing a vote on real PostgreSQL; row locks serialize those
  operations. Embedded single-connection tests do not exercise concurrent sessions.

## Rollback

If the migration fails, its transaction rolls back. After a successful migration,
prefer rolling back the website deployment while leaving the additive database
schema installed. Legacy clients continue using their existing RPCs.

Do **not** drop the new columns, constraints, or review history after new
submissions/reviews exist: that would lose classification and maintenance data.
A full database rollback requires a backup plus an explicit preservation/export
plan for post-migration ideas, votes, links, and history. There is deliberately
no destructive down-migration script.
