# Tool Idea claiming: deployment and external integration

After these historical migrations/cleanups, apply the
[generic Ideas rename](./IDEAS_RENAME_ROLLOUT.md) last. The current website uses
`ideas`, `idea_votes`, `claim_idea`, `upvote_idea`, and `remove_idea_vote`.
Old identifiers below describe pre-rename migration steps, not the current API.

## What is included

- Any signed-in user can pick up an open **Tool Idea** with a canonical GitHub
  repository URL. No developer profile is required or automatically enabled.
- A database transaction reserves the idea and marks it **In progress**.
  The API then sends Discord/creator-email notifications directly.
  Released claim records are retained, but review audit history is not.
- The public board, submitted ideas on the dashboard, and maintainer UI show
  claim details. Maintainers can correct the repository, close as Implemented,
  or explicitly release and reopen the idea.
- Existing list RPC signatures remain intact. The website uses the new
  `get_ideas_with_claims(text)` projection; legacy open-only Tool Idea lists
  stop showing an idea when it is claimed. Voting remains available in progress.

## Supabase: scripts you must run

To remove the optional idea audit trail on an already-migrated database, run
[ideas-remove-review-history.sql](./sql/ideas-remove-review-history.sql) last.
It permanently deletes existing history, removes its trigger/function, and
updates the claim-review RPC to stop recording repository corrections.
Ideas, votes, claims, and release timestamps are preserved. After this cleanup,
audit-history statements in older verification scripts no longer apply.
Do not rerun the older baseline/claiming migrations afterward: they recreate or
depend on history. Future migrations must account for history being removed.

If you already applied the original claiming migration, run only
[ideas-claiming-remove-notifications.sql](./sql/ideas-claiming-remove-notifications.sql)
for this simplification. It updates `claim_tool_idea` to stop inserting delivery
rows, then removes the old worker function and notification table. It preserves
claims/history and intentionally discards old notification records. Do not just
delete the table while the old function still references it. Coordinate this
script with deployment of the new direct-send code.

Nothing in this repository automatically applies SQL to your Supabase project.
Back up first and test on staging. Use the Supabase SQL editor as the database
owner, not an anonymous/authenticated application client.

### If the combined Ideas board is already deployed

1. Confirm the existing baseline includes the combined Ideas migration, vote
   removal, and backend-edit corrections described in
   [the original rollout guide](./IDEAS_BOARD_ROLLOUT.md). Historical copies of
   these scripts have been restored from local Git history for reference/tests.
   **Do not rerun `ideas-migration.sql` on an already-migrated database.**
2. If either follow-up is missing, apply
   [ideas-remove-vote.sql](./sql/ideas-remove-vote.sql) and/or
   [ideas-backend-edits.sql](./sql/ideas-backend-edits.sql) before proceeding.
   Do not apply those older scripts after the claiming migration: they replace
   functions now extended by claiming. Reapply the claiming script last if needed.
3. Run [ideas-claiming.sql](./sql/ideas-claiming.sql). It is transactional,
   additive, and safe to reapply. It briefly locks idea writes.
4. Run [ideas-claiming-verification.sql](./sql/ideas-claiming-verification.sql).
   Permission flags must all be true and `invalid_claims` must be zero.
5. Only then deploy the dependent website/API changes.

If the combined Ideas board has not been migrated, follow the original rollout
guide first, then apply the claiming migration. If your live schema differs
from the restored baseline, compare its functions, policies, and constraints
before running either migration; do not drop unknown constraints to force it through.

### Creator account linkage

New authenticated submissions receive `creator_user_id` from `auth.uid()` in
a database trigger. Anonymous/installation-based submissions stay unlinked.
Existing submissions are deliberately **not** backfilled from `install_id`,
submitted email, or `app_version`; none proves who authenticated the submission.

Consequently, existing ideas only receive creator emails if an operator links
them using independently verified provenance. Do not bulk-match email or
UUID-looking installation IDs. Unlinked/deleted creators and accounts without
an email have an explicit skipped delivery outcome. Free-text idea email
addresses are not notification recipients.

## Hosting configuration

Set these server-side environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
DISCORD_EVENTS_URL
DISCORD_EVENTS_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_SITE_URL
```

Never expose the service-role key or Discord secret in client environment variables.
No cron or `CRON_SECRET` is required. Already-migrated databases need the cleanup
script above to remove the old claim function's notification-table dependency.

- Claims send Discord and eligible creator emails directly during the request,
  immediately after the database commit and before returning the success response.
- Only a newly created claim sends notifications. An identical repeated request
  returns the saved claim without sending again. No notification table is used.
- Failed deliveries are logged and returned as a warning; the claim remains saved.
  There is no persisted delivery status or automatic retry; inspect server logs.
- Missing notification credentials are logged as failures, not silently treated
  as sent. If the request process exits before delivery, there is no automatic
  recovery without a later request or operator action.
- Add `https://<your-site>/ideas**` to Supabase Auth's redirect allowlist as
  appropriate for your domain. Claim sign-in returns through
  `/ideas?idea=<uuid>` so OAuth/magic-link token fragments do not lose the idea;
  the board then restores the idea anchor. Other sign-ins still use `/dashboard`.

Notification failures are visible in server logs and the claim response warning.
The verification script checks ownership rules and grants, not delivery status.

### Duplicate-delivery limitations

Claim retries are idempotent and do not send again. The claim UUID identifies the
Discord event and Resend idempotency key. Delivery is best-effort: an interrupted
request or provider failure can lose a notification, with no automatic recovery.
Releasing/correcting/closing an idea does not send a new initial-claim alert.

## External change required: Discord receiver prompt

Use this prompt in the repository that owns the PPTB Agent Discord signed-event
receiver. Deploy its support before enabling claims on the website.

```text
Extend the existing PPTB signed Discord event receiver to support `idea.claimed`.
Preserve existing events, HMAC verification, request timestamp/replay checks,
delivery routing conventions, and notification configuration.

The website sends the existing envelope:
{
  "type": "idea.claimed",
  "id": "<claim UUID>",
  "occurredAt": "<original claim timestamp>",
  "data": {
    "idea": {
      "id": "<idea UUID>",
      "title": "<idea title>",
      "url": "https://www.powerplatformtoolbox.com/ideas#idea-<idea UUID>"
    },
    "claimedBy": { "name": "<public display name>" },
    "repositoryUrl": "https://github.com/owner/repository",
    "claimedAt": "<original claim timestamp>"
  }
}

Transport:
- POST to DISCORD_EVENTS_URL with Content-Type: application/json.
- X-PPTB-Timestamp is the current Unix timestamp for each delivery attempt.
- X-PPTB-Signature is "sha256=" + HMAC-SHA256(secret,
  `${timestamp}.${exactRawRequestBody}`).
- The website times out a delivery after five seconds.

Validate the payload. Route it to the appropriate community ideas/tool-development
channel using existing routing patterns. Render an "A Tool Idea is now in progress"
announcement with the idea title/link, claimant display name, GitHub repository,
and start date. Escape/truncate untrusted text to Discord limits and disable
untrusted mentions (`allowed_mentions.parse = []`). Never request/publish creator
email or installation/account IDs; these are not included in the payload.

Deduplicate durably by envelope id, including concurrent retries. A duplicate
accepted event should return 2xx without posting again. Check request freshness
against X-PPTB-Timestamp, not occurredAt: queued deliveries can be retried days
after the original claim. Return non-2xx for unsupported/invalid payloads or
failed durable acceptance, rather than silently acknowledging a dropped event.
If sending to Discord cannot finish within the website's timeout, persist the
accepted event in the receiver's existing durable queue before acknowledging it.

Add tests for HMAC verification, valid rendering/routing, malformed payloads,
mention suppression, stale request rejection, old-event/current-request retries,
concurrent duplicate delivery, and Discord failures. Document any new routing
configuration. Do not change the website's event contract.
```

The breaking rename requires updating desktop callers before cutover. Use the
complete [desktop prompt](./IDEAS_DESKTOP_PROMPT.md). For the claim-details portion:

```text
Update the PPTB desktop Ideas board to read get_ideas_with_claims(p_install_id)
instead of get_ideas, preserving installation-based voting and submission.
Support the new in_progress status for Tool Ideas, keep voting enabled for it,
and show claimant_name, repository_url, and claimed_at when claim_id is present.
Never offer claims for PPTB Desktop/VSCode ideas. For an open Tool Idea, link to
the website's /ideas#idea-<id> claim flow; do not add anonymous/installation-based
claiming. Use ideas for submissions, upvote_idea/remove_idea_vote for votes,
and idea_votes for vote storage. The six-column open-only helper is now
get_open_tool_ideas; get_tool_ideas and old vote RPC names no longer exist.
Handle the new RPC's absence explicitly on environments not yet migrated.
```

## Staging acceptance

1. Submit a Tool Idea while signed in as its creator; verify the creator
   reference is populated without exposing it in public reads.
2. As a different signed-in user without the developer flag, claim it with a
   repository URL. Confirm public details, Discord, creator email, and delivery
   outcomes. Confirm the developer flag is unchanged.
3. Try claiming Desktop/VSCode ideas and non-open Tool Ideas, including direct
   RPC calls; all must fail.
4. Test simultaneous claims using two independent authenticated PostgreSQL/API
   sessions: hold the first transaction open after `claim_tool_idea`, call it
   as a different user in the second session, then commit the first. Expect one
   claim, one conflict, and notifications only from the successful new claim. Also race a stale
   maintainer review against a claim; no saved claim may be overwritten.
5. Retry the successful request; no new claim or notification sends occur.
6. Temporarily make one notification provider unavailable. Verify the claim
   still succeeds with a warning, the other channel can complete, and the failed
   delivery is logged. No retry should occur.
7. Verify missing/unlinked/deleted creators skip email, while transient account
   lookup failures produce a warning without undoing the claim.
8. Correct a repository, close as Implemented, then explicitly release/reopen
   another claimed idea. Verify the old claim's release timestamp and that a new user can claim
   the released idea without another initial alert for the old claim.
9. Smoke-test the released desktop binary, voting, sign-in return links, and
   dashboard progress rendering against staging.

The local PGlite suite validates database rules, claim idempotency, cleanup, and
released claim records; it does not substitute for independent PostgreSQL-session concurrency
or live provider/released-desktop checks.

## Local validation

```sh
node --test tests/ideas.test.mjs tests/ideas-database.test.mjs \
  tests/discord-notify.test.mjs tests/idea-claiming.test.mjs \
  tests/idea-claiming-ui.test.mjs tests/submit-tool.test.mjs
npx tsc --noEmit --incremental false
npm run build
```

The focused suite covers direct-send behavior. Mocked browser validation
also covers a first-time user's claim and a maintainer's release action.
