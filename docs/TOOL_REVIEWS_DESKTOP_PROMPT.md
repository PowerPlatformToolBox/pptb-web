# Desktop implementation prompt

```text
Update tool reviews in PowerPlatformToolBox/desktop-app to match the website:
required tool version, a reminder to report issues on the tool's GitHub page,
and one editable tool-author response per review (not a conversation thread).

Inspect existing review UI, database/API calls, authentication and installation
identity handling, localization, safe external-link helpers, and tests first.
Implement desktop changes only; do not create a competing schema or ship a
service-role key. Preserve existing rating/installation identity behavior.

Shared database contract (apply the attached SQL before using new fields):
- ratings.tool_version: nullable text for backward compatibility. When supplied,
  it must be trimmed, 1-100 characters. Require it in the updated desktop UI,
  just as the new web UI does. Older clients may omit it or send NULL.
  Display "Version not specified" for NULL. Never backfill old reviews using
  today's tool version.
- rating_author_replies: rating_id uuid PK/FK to ratings(id), reply text
  (trimmed, 1-2000 characters), created_at and updated_at timestamptz.
  Public read only; direct client inserts/updates are not allowed.
- Save/edit using RPC save_rating_author_reply(p_rating_id uuid, p_reply text),
  with the signed-in user's JWT. Returns a single record containing rating_id,
  reply, created_at, updated_at. The database checks tools.user_id = auth.uid()
  through ratings.tool_id, including when editing an existing response.
  One response per rating; editing preserves created_at and updates updated_at.
  Review deletion cascades to its response. There is no delete-response feature.
- Author means the authenticated owner (tools.user_id), NOT contributor name,
  GitHub username, email, or a client-supplied identity.

Website API alternative if the desktop already uses these endpoints:
- POST /api/ratings/submit with Bearer JWT and JSON
  { toolId, rating, comment, toolVersion }. Rating is an integer 1-5;
  comment is optional, maximum 500 characters. The endpoint accepts omitted/NULL
  toolVersion for older clients; updated clients must always supply it.
- GET /api/ratings/{toolId} returns { ratings: [...] }, with id, toolId,
  userName, rating, comment, toolVersion (nullable), createdAt,
  authorReply: null | { reply, createdAt, updatedAt }.
  No user IDs, installation IDs or emails are returned.
- GET /api/ratings/{toolId}/reply with Bearer JWT returns { canReply }.
- POST /api/ratings/{toolId}/reply with Bearer JWT and
  { ratingId, reply } returns { authorReply: { reply, createdAt, updatedAt } }.

UX:
1. Require the actual tool version used. Preselect the installed version only
   when reliably known; allow correction. Never substitute the desktop-app
   version or silently assume the latest catalog version.
2. Show the reviewed version on all review lists/details.
3. Beside review entry, remind users: "Reviews are for sharing your experience.
   Please log bugs and issues on the tool's GitHub page, not in a review."
   Link to the reviewed tool's repository /issues, NOT the desktop repository
   unless it really is that tool's repository. Validate HTTPS github.com URLs
   and use the existing safe external opener. If no valid repository exists,
   show the reminder without inventing a link.
4. Display public responses as "Tool author response", with response text and
   date. Only the signed-in tool owner sees Reply/Edit controls. Preserve the
   draft on errors, prevent duplicate saves, support cancel and show explicit
   authentication, authorization, validation, and database failure messages.
   Refresh permissions on sign-in/out. Server/database checks remain mandatory.
5. Keep review/reply text safely escaped, not unsanitized HTML. Make HTTP/HTTPS
   URLs clickable using the safe external opener, preserve line breaks, and
   exclude trailing prose punctuation from links. Never link unsafe schemes.
6. Use a shared date-formatting utility for reviewer and author response dates.
   Both use the long English format, e.g. "October 23, 2026", not numeric dates.
   Continue using review created_at and response updated_at respectively.

Test version validation and persistence; reliable installed-version defaults;
legacy NULL versions and old-client submissions with omitted/NULL versions;
the correct GitHub link and missing/invalid repositories;
public response display; owner create/edit, non-owner and anonymous rejection;
ownership changes; cross-tool review IDs; one response per review; cancellation,
failed saves, privacy (no emails/IDs), and unchanged rating aggregates.
Run focused tests, lint, type-check/build. Summarize implementation and rollout
requirements, including the effect on old desktop clients below.
```

## Rollout

Attach [tool-review-versions-replies.sql](./sql/tool-review-versions-replies.sql).
Back up and apply it to staging first, then deploy both clients and validate
against the real schema before production. The migration is transactional and
rerunnable. It does not invent versions for historical reviews or change rating
aggregation. Existing rows can still receive unrelated updates without a version.

**Backward compatibility:** both the database and website submission endpoint
accept omitted/NULL `tool_version` so older desktop versions can still submit
reviews. The updated web and desktop forms require a version; supplied versions
are validated at the API/database boundary. Do not invent a version for older
clients. Confirm existing rating RPCs forward the supplied version for new
clients while preserving their legacy signatures. Old clients can continue
reading pre-existing fields. The desktop release need not be simultaneous with
the migration. If the earlier strict migration was already applied, rerun this
updated SQL and deploy the updated website API to restore legacy submissions.

The website uses the existing `tools.user_id` ownership model. A transferred tool's
current owner can edit its response; previous owners cannot. Historical responses
remain labeled as tool-author responses, with no personal identifiers exposed.

Local validation:

```sh
node --test tests/ratings-privacy.test.mjs tests/tool-review-*.test.mjs
npx tsc --noEmit
```
