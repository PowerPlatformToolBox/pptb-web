# Tool Maturity Model: Phase 1 Local Testing

## Prerequisites

- Use a local or non-production Supabase project with the existing `tools` and `user_profiles` tables.
- Confirm `user_profiles.is_tool_developer` exists.
- Keep one authenticated tool developer, one authenticated non-developer, and one tool owned by the developer available as test fixtures.

## Apply the schema

Run these files separately in the Supabase SQL editor, in this order:

1. `scripts/01_maturity_model_tables.sql`
2. `scripts/02_maturity_model_rls.sql`

The scripts are intentionally not idempotent. Do not rerun either script after it succeeds.

## Verify tables and criteria

Run as a database owner:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'tool_maturity',
    'tool_verification_requests',
    'tool_verification_criteria',
    'tool_verification_checklist_results',
    'tool_grace_periods',
    'tool_user_concern_reports'
  )
order by table_name;

select count(*) as criteria_count,
       count(*) filter (where required) as required_count,
       count(*) filter (where not required) as optional_count,
       min(sort_order) as first_sort_order,
       max(sort_order) as last_sort_order
from tool_verification_criteria;
```

Expected results:

- Six physical tables are returned. The specification groups criteria and checklist results into one model area, but they are separate tables.
- `criteria_count = 13`, `required_count = 11`, `optional_count = 2`, `first_sort_order = 1`, and `last_sort_order = 13`.

## Verify request invariants

Using the test developer and their tool, insert one `queued` request. A second `queued` or `in_review` request for the same tool must fail on `idx_one_active_request_per_tool`.

Change the first request to `cancelled` as the service role, then insert another `queued` request. The new request must succeed, confirming that rejection and cancellation do not prevent a full resubmission.

## Verify RLS

Exercise these checks through authenticated Supabase clients rather than the SQL editor's owner role:

| Actor          | Operation                                              | Expected          |
| -------------- | ------------------------------------------------------ | ----------------- |
| Anonymous      | Read `tool_maturity` and `tool_verification_criteria`  | Allowed           |
| Anonymous      | Read any other maturity-model table                    | Denied or no rows |
| Tool developer | Insert their own request for their own tool            | Allowed           |
| Tool developer | Insert a request for another developer's tool          | Denied            |
| Non-developer  | Insert a verification request                          | Denied            |
| Tool developer | Read their own requests                                | Allowed           |
| Tool developer | Read another developer's requests                      | No rows           |
| Tool developer | Update a request or checklist result                   | Denied            |
| Reporter       | Insert and read their own concern report               | Allowed           |
| Tool owner     | Read a report filed by someone else against their tool | No rows           |
| Service role   | Perform review and governance writes                   | Allowed           |

## Workflow tests

Continue with `docs/MATURITY_MODEL_PHASE_2_TESTING.md`, `docs/MATURITY_MODEL_PHASE_3_TESTING.md`, and `docs/MATURITY_MODEL_PHASE_4_TESTING.md` after the schema and RLS checks pass.
