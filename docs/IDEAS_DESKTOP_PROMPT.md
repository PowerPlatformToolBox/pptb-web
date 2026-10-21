# Desktop implementation prompt

Use this prompt in the desktop repository after the database migration is finalized:

```text
Update the Power Platform ToolBox desktop application's Tool Ideas experience to
a combined "Ideas" board. Implement desktop changes only; do not modify the
website or database schema.

Read the attached Ideas rollout document and migration SQL first. Inspect the
existing UI, database calls, identity model, navigation, localization, and tests.
Do not invent RPCs or silently fall back if the migrated database is unavailable.

Types:
- pptb_desktop: PPTB Desktop
- pptb_vscode: PPTB VSCode Extension
- tool: Tool Ideas

Statuses:
- open: Open
- under_review: Under review
- planned: Planned
- closed: Closed
- duplicate: Duplicate

Closed resolutions:
- implemented: Implemented
- not_planned: Not planned
- out_of_scope: Out of scope
- withdrawn: Withdrawn

Database contract:
- Read get_ideas(p_install_id text DEFAULT '') using the existing installation ID.
- Result columns: id, title, description, idea_type, status, resolution,
  public_note, duplicate_of, github_issue_url, created_at, updated_at,
  upvotes, has_upvoted. Nullable fields: resolution, public_note, duplicate_of,
  github_issue_url. IDs are UUIDs, timestamps are timestamptz, upvotes is bigint.
- Submit to tool_ideas using the existing fields plus an explicit idea_type.
  Do not write maintainer metadata or override the default open status.
- Vote using upvote_tool_idea(p_idea_id uuid, p_install_id text), retaining the
  current authenticated/installation identity model. Result remains
  upvotes bigint, has_upvoted boolean.
- Remove the current identity's vote with
  remove_tool_idea_vote(p_idea_id uuid, p_install_id text). It returns the same
  upvotes/has_upvoted shape and is idempotent. Requires ideas-remove-vote.sql.
- Legacy get_tool_ideas remains available for older versions; the updated UI
  must use get_ideas to display all types and statuses.

UX requirements:
1. Rename navigation/headings to Ideas.
2. Combine all types/statuses by default; order votes descending, then creation
   date descending. Add independent type and status filters.
3. Show type/status badges and closed resolution where present.
4. Require explicit idea-type selection on submission.
5. Preserve existing validation limits, identity handling, and repeat-vote rules.
6. Permit adding AND removing votes only for open, under_review, and planned
   ideas. A voted button removes the caller's vote; an unvoted button adds one.
   Disable vote changes for closed/duplicate ideas and retain their vote totals.
   Handle RPC rejection explicitly when a status changes after loading. Apply
   the returned count and has_upvoted state and re-sort after either action.
   Prevent concurrent clicks while saving; never implement a non-idempotent
   server-side toggle or remove another identity's vote.
7. Show the public maintainer explanation.
8. For duplicate ideas, provide a working link/navigation to the original idea,
   even if the current filters exclude it. Do not transfer votes.
9. For linked PPTB ideas, show "View GitHub issue" using the existing safe
   external-link mechanism. Validate supported HTTPS repository issue URLs
   before opening externally.
10. GitHub is authoritative for implementation progress. The board's status is a
    manually maintained triage summary; linking an issue does not mean delivery.
11. Keep any tool-building/submission suggestion selectors Tool Ideas only,
    excluding closed/duplicate ideas from new suggestions.
12. Do not add maintainer controls, issue creation, imports, or status syncing.

Testing:
- Cover all types/statuses, composed filters, submissions, votes/repeat votes,
  removal/repeated removal, re-voting, identity isolation, ineligible removals,
  linked/unlinked issues, resolutions, duplicate navigation and error states.
- Test against the migrated staging database, including anonymous installation
  identity if supported by the current client.
- Preserve the existing database contracts for older released desktop versions.
- Run relevant tests, lint, and type-check/build. Summarize changes and deployment
  prerequisites.
```

Attach [IDEAS_BOARD_ROLLOUT.md](./IDEAS_BOARD_ROLLOUT.md) and
[ideas-migration.sql](./sql/ideas-migration.sql), and
[ideas-remove-vote.sql](./sql/ideas-remove-vote.sql) when handing off the prompt.
