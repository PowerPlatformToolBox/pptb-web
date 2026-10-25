# Tool idea claiming plan

## Goal

Let any signed-in user claim an open Tool Idea, supply its GitHub repository, and
announce that development has started. A successful claim marks the idea
**In progress**, prevents another developer from claiming it, alerts Discord,
and emails the idea creator when the idea is linked to a user account.

This document records the agreed implementation plan. The repository now includes
the implementation and local tests; see the
[rollout instructions](./IDEAS_CLAIMING_ROLLOUT.md) for required Supabase scripts,
hosting configuration, external integration prompts, and staging checks.
The later [generic Ideas rename](./IDEAS_RENAME_ROLLOUT.md) supersedes the old
table/RPC names in this original plan; the Tool Ideas-only claiming scope is unchanged.

## Confirmed scope

- Claiming applies exclusively to Tool Ideas (`idea_type = tool`).
- PPTB Desktop and PPTB VSCode Extension ideas are excluded and retain their
  existing maintainer/GitHub-issue workflow.
- Any signed-in user can claim an eligible Tool Idea, including someone starting
  their first tool. The existing developer-profile flag is not a prerequisite.

## Recommended behavior for approval

- Only `idea_type = tool` and `status = open` ideas can be claimed.
- Claiming requires sign-in only, not `user_profiles.is_tool_developer`.
  Anonymous users can view progress but cannot claim. Preserve the existing
  developer classification mechanism; claiming alone does not automatically
  change that flag.
- One active claimant per idea. A developer may claim multiple ideas.
- Require a canonical HTTPS GitHub repository URL, separate from the existing
  `github_issue_url`. Validate repository URLs, not issue, release, or tree URLs.
  Repository ownership/existence checks and GitHub OAuth are outside this scope.
- Public cards show the developer's display name, repository link, and claim date,
  never their email or installation identifier.
- Continue allowing vote additions/removals while an idea is in progress.
- No automatic expiry, developer self-release, repository editing, completion
  detection, or GitHub synchronization in the initial release. Maintainers can
  explicitly release/reopen a claim or close the idea using existing resolutions.

The behavior choices above are proposals, not existing behavior. Tool Ideas-only
scope and access for any signed-in user are confirmed.

## User process

### Person picking up an idea

1. Visit the Ideas board and browse Tool Ideas. An open, unclaimed Tool Idea
   offers **Start working on this**; other idea types do not offer this action.
2. If signed out, follow the sign-in prompt and return to the selected idea.
   No existing tool, developer flag, or developer onboarding is required.
3. Open **Start working on this**. The form shows the idea title and asks for
   the GitHub repository where the tool will be developed and published.
   Someone without a repository creates one on GitHub first, then returns.
4. Enter a repository URL such as `https://github.com/owner/repository`.
   Invalid links show an inline explanation and preserve the entered value.
5. Review the confirmation: "You are starting work on this idea. It will be
   marked In progress and reserved to you. We will announce this on Discord
   and notify the idea creator if their account is linked."
6. Select **Confirm and start working**. Disable repeat submission while saving.
   Opening the form alone does not reserve the idea.
7. After the claim is saved, show **You're now working on this idea**, update
   the card to **In progress**, and show the claimant's display name, repository
   link, and start date. Notifications are sent directly after saving the claim.
   A delivery failure shows a warning without undoing ownership.
8. Continue development in the linked GitHub repository. The initial release
   does not automatically change developer classification or publish a tool
   to the catalog; existing tool submission remains a separate process.
9. If abandoning work, changing the repository, or finishing the tool, contact
   a maintainer for the relevant update. Self-service claim management is not
   included in the proposed initial scope.

### Other visitors and competing claimants

- Anyone can see that the idea is in progress, who picked it up, and the GitHub
  repository. The claim action is no longer available.
- Visitors can follow the repository and continue voting under the proposed
  in-progress voting behavior.
- If two people confirm at the same time, only one succeeds. The other sees
  "This idea has already been picked up" and the refreshed claim details.
  Their attempt does not trigger another announcement or creator email.
- If the idea was closed or otherwise became ineligible while the form was
  open, explain that it is no longer available and refresh its status.
- If saving fails, preserve the input and show an actionable retry message.
  After an uncertain network response, a retry retrieves an already-committed
  claim rather than creating another claim or duplicate notification work.

### Idea creator and Discord community

1. Once the claim is committed, Discord receives an announcement with the idea
   title/link, claimant display identity, and GitHub repository link.
2. If the idea has a linked creator account with an available email, that
   creator receives an email saying someone has started work, with links to
   the idea and repository.
3. Unlinked creators are not emailed, even if the original submission contains
   a free-text email address. No private contact information is published.
4. Notification delivery problems do not undo the claim. Failed deliveries
   remain visible to operators; no cron or scheduled retries are used.

### Maintainer follow-up

1. Open the idea in Manage Ideas to see its current claim details.
2. If work is abandoned, explicitly release the claim and reopen the idea.
   It becomes available for another signed-in user; the previous claim remains
   as a released claim record. No automatic expiry is proposed.
3. If the tool is delivered, close the idea as **Implemented** with the existing
   required public explanation. Retain the repository and claim provenance.
4. Repository corrections require an explicit maintainer update, without audit history.
   These follow-up actions do not emit another initial-claim announcement.

## Implementation

### 1. Recover and confirm the database baseline

- Obtain the deployed ideas schema, grants, RLS policies, triggers, RPCs, and
  history definitions before designing the migration.
- The missing baseline scripts in `docs/sql/` have been restored from local
  Git history for reference and migration tests. Confirm they match the deployed
  baseline before applying the additional claiming migration.
- Inspect the existing Discord event receiver and its supported event types;
  a new sender event may require a coordinated change outside this repository.

### 2. Add an atomic, authorized claim operation

- Introduce `in_progress`, claimant user reference, repository URL, and claim
  timestamp. Preserve released claim records; do not store review audit history.
- Add a database claim RPC that derives the actor from verified authentication,
  accepts any signed-in user, and atomically transitions only an unclaimed,
  open Tool Idea. Enforce these rules in the database, not just the UI/API.
- Serialize claims and maintainer updates on the same idea. Two simultaneous
  claims must produce one winner and one explicit conflict.
- Reject direct client writes to protected claim fields, including attempts to
  populate them during idea submission.
- Repeating the successful claimant's identical request should return the
  existing claim without queuing notifications again. Conflicting requests
  return HTTP 409; invalid input, missing authentication, forbidden access,
  and missing ideas have distinct errors.
- Integrate existing review validation and database triggers so admins
  cannot accidentally create an in-progress idea without a claim or reopen it
  while leaving an active claim behind. Closing retains claim provenance;
  releasing/reopening clears active ownership and records the release.
- Support explicit maintainer repository corrections without changing
  claim ownership or creating another initial-claim notification.

### 3. Establish trustworthy creator linkage

- Add a nullable creator user reference, populated from `auth.uid()` for new
  authenticated submissions. Preserve legacy installation-based submissions.
- Do not treat a UUID-looking `install_id` or a matching submitted email as proof
  of account ownership. Backfill only where trustworthy provenance is available;
  otherwise leave the creator unlinked.
- Resolve a linked creator's account email server-side using existing email
  helpers. Do not send to the free-text idea email under this requirement.
- An unlinked/deleted creator or unavailable email produces an explicit skipped
  notification outcome; it does not prevent claiming the idea.

### 4. Expose the API and update all website surfaces

- Add an authenticated claim endpoint using existing bearer-token conventions.
  Validate the idea ID and repository URL, call the atomic RPC, and return the
  committed claim and explicit conflict/error responses.
- Extend shared idea types, status labels, filters, voting eligibility, badges,
  public reads, and admin review controls.
- Enforce Tool Ideas-only claiming in both the API and database. Show claim
  actions/details only for Tool Ideas; do not allow the new claim-driven
  `in_progress` status for PPTB Desktop/VSCode ideas.
- Preserve the existing public RPC contract where required; if adding returned
  fields requires replacing a PostgreSQL function, assess dependent clients and
  use a versioned read RPC when necessary.
- On open Tool Idea cards, show **Start working on this** to any signed-in user,
  with sign-in guidance for anonymous visitors. Do not require developer
  onboarding or an existing developer profile.
- Collect the repository URL and confirm that the action reserves the idea.
  Disable submission while pending; refresh the card after success or conflict.
- Show **In progress**, developer name, repository link, and claim date in the
  shared card/details UI. Claimed ideas cannot be claimed again.
- Preserve the legacy `get_tool_ideas` contract: claimed ideas disappear from
  its open-only list. Document the resulting desktop-client behavior.

### 5. Deliver notifications directly (best-effort)

- Do not persist notification records. Only the request that creates a new claim
  sends notifications; identical repeated requests do not send again.
- Reuse the signed Discord transport with a new `idea.claimed` event containing
  the idea title/link, developer display identity, and repository URL.
- Add an idea-claimed email template and sender using the existing React Email
  and Resend conventions. Include the same public details and idea link.
- Send directly within the claim request after commit, without a cron endpoint
  or deployment schedule. Log channel-specific failures explicitly.
- Use a stable claim/event identity and provider/receiver deduplication where
  supported. Only the winning claim creates delivery work; retrying the claim
  must not create another event. Document any remaining delivery duplication risk.
- A notification failure never rolls back a committed claim or reports the
  claim as failed. Log failures and show a warning; there is no automatic retry.
- Confirm the Discord receiver supports the new event before rollout.

## Validation and acceptance criteria

- Database tests cover eligibility, non-tool/non-open ideas, protected fields,
  spoofed identity, claim/review races, release/reclaim, and preserved vote/claim-record
  behavior. Test true simultaneous requests against staging PostgreSQL as well
  as the repository's PGlite fixtures.
- Two different developers claiming the same idea concurrently yield exactly
  one active claim and one claim event, with a conflict for the losing request.
- Retrying a committed claim returns the existing result without new delivery work.
- API tests cover authentication, users with and without the developer flag,
  malformed repository URLs,
  conflict responses, and notification failures after a successful commit.
- Creator-notification tests cover linked, unlinked, deleted, and missing-email
  accounts; private creator details never appear in public responses or Discord.
- Notification tests verify event payloads/signing, email content, independent
  channel retries, and duplicate prevention.
- UI checks cover signed-out guidance, first-time developers, claim confirmation, pending
  state, stale-card conflicts, in-progress filtering/voting, and admin release.
- Run focused ideas/notification tests, TypeScript checking, and targeted lint.
  Smoke-test desktop compatibility and the complete flow in staging.

## Rollout

1. Resolve the missing SQL baseline and approve the scope choices above.
2. Apply/test the additive schema and claim RPC on staging, then production.
   Previously deployed claiming databases need the notification cleanup script.
   Apply the review-history cleanup script last to remove audit storage and writers.
3. Coordinate Discord receiver support and notification credentials; no cron is needed.
4. Deploy the API, website/admin UI, and email changes; verify one end-to-end claim.
5. Update the ideas rollout guide and desktop integration guidance.
6. If rollback is needed, disable new claims first while preserving existing claims,
   released claim records. Do not erase ownership to revert the UI.
