# Desktop implementation prompt

```text
Update tool review submission in PowerPlatformToolBox/desktop-app:
- Only installed tools can be rated.
- Capture the actual installed tool version with the review.
- Remind reviewers to report bugs and issues on the tool's GitHub page.

The desktop currently only captures reviews; it does not display reviews.
Do not add review lists, review details, author responses, or response editing.
Do not add website API calls. Retain the existing direct database/RPC submission
path and authentication/installation identity model. Do not ship a service-role
key or create a competing database schema.

Inspect existing rating entry points, review dialog, submission handlers,
installed-tool state, version metadata, database/RPC calls, localization,
external-link helpers, and tests before implementing.

Installation eligibility:
1. Permit rating from both the installed-sidepane tool card and tool details
   page only when that specific tool is installed locally. Hide the rating
   action for uninstalled tools. Preserve existing aggregate rating displays.
2. Use the canonical installed-tool state and stable tool identity shared by
   the app, not display names, catalog availability, or the currently selected
   tool. Reuse or extract one eligibility helper so entry points stay aligned.
3. Guard opening the review dialog AND submitting the review. Hiding a button
   is not enough: alternate entry points and stale UI must not bypass the rule.
   Put the final check in the existing trusted submission handler/main-process
   boundary when that is where installation state is authoritative.
4. Resolve installation state before enabling review entry. If state cannot
   be loaded, keep rating unavailable and surface the error using existing UX;
   do not assume the tool is installed.
5. Recheck installation status and installed version immediately before
   submitting. If the tool was uninstalled while the dialog was open, prevent
   submission and explain that the tool must be installed to submit a review.
   Handle installs/uninstalls without requiring an app restart.
6. Keep any existing authentication, duplicate-review, and rating eligibility
   rules; being installed is an additional condition, not a replacement.

Version capture and database contract:
- ratings.tool_version is nullable text for backward compatibility. When
  supplied, it must be trimmed and contain 1-100 characters.
- The updated desktop review form must capture and require the actual
  installed tool version. Populate it from reliable local installation
  metadata, not the latest catalog version or desktop-app version.
- Show the version being reviewed in the dialog. If local version metadata
  is unavailable, require explicit entry; do not invent or silently omit it.
- If the installed version changes while the dialog is open, update the
  displayed version and ask the reviewer to confirm before submitting, rather
  than silently associating their review with a different version.
- Persist tool_version alongside the existing review fields through the
  existing database/RPC submission path. If a rating RPC needs updating, supply
  backward-compatible SQL and preserve existing signatures/callers. An older
  call omitting the version must still work; do not introduce overload ambiguity.
- Older desktop clients may omit tool_version or send NULL. Never add a
  NOT NULL constraint or require versions globally in the database.
- Do not backfill historical reviews using today's installed/catalog version.
- Preserve existing review validation, identity handling, and rating aggregates.

GitHub reminder:
Beside review entry, show:
"Reviews are for sharing your experience. Please log bugs and issues on the
tool's GitHub page, not in a review."
Link to the reviewed tool's repository /issues, not the desktop repository
unless that really is the tool's repository. Validate HTTPS github.com
repository URLs and use the app's existing safe external opener. If no valid
repository exists, show the reminder without inventing a link.

Submission UX:
- Prevent duplicate submissions while saving.
- Preserve the draft on failure and allow cancellation.
- Show explicit installation, validation, authentication, and database errors
  through the existing notification/form patterns.
- Do not report success until the database confirms persistence.

Tests:
- Installed tools can open and submit a review from both the installed-sidepane
  card and tool details page.
- Uninstalled/catalog-only tools have no rating action and cannot open or
  submit reviews via alternate handlers.
- A different installed tool does not make the current tool eligible.
- Unknown/failed installation state does not enable rating.
- Installing/uninstalling updates both entry points; uninstalling while the
  dialog is open prevents submission.
- Version comes from the installed tool, even when the catalog advertises a
  newer release. Missing version metadata requires entry; blank and overlong
  versions are rejected. Version changes require confirmation.
- The actual database/RPC payload persists tool_version and existing identity
  fields correctly; older calls with omitted/NULL versions still succeed.
- Correct GitHub issues link, missing/invalid repositories, safe external open,
  cancellation, failed saves, and duplicate-submit prevention.
- No new website API dependency, review-display UI, or author-reply features.

Run focused tests, lint, and type-check/build. Summarize changes, any database
RPC migration needed, and staging validation results.
```

## Rollout

Attach [tool-review-versions-replies.sql](./sql/tool-review-versions-replies.sql)
for the shared database contract. Author-reply objects in this migration support
the website only; they do not require desktop UI or desktop integration.

Apply the migration to staging before testing submissions with `tool_version`.
Validate the desktop's actual database/RPC path against the real schema. The
existing website migration does not modify desktop-specific rating RPCs; inspect
those before deciding whether additional backward-compatible SQL is needed.

The database accepts omitted/NULL versions so older desktop clients can still
submit reviews. Requiring an installed tool and capturing its version are rules
for the updated desktop client; this migration cannot enforce local installation
state for older clients. No coordinated desktop upgrade is required.

The shared migration is transactional and rerunnable. If the earlier strict
version was already applied, rerun the updated SQL to restore submissions without
a version. Never invent versions or change rating aggregates for compatibility.
