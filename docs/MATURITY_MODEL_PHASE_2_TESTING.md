# Tool Maturity Model: Phase 2 Local Testing

## Prerequisites

- Apply both Phase 1 SQL scripts.
- Configure Supabase and Resend server environment variables.
- Use a user whose `user_profiles.is_tool_developer` is true and who owns an active tool.

## Submit a request

1. Sign in as the developer and open `/dashboard`.
2. Select **My Tools** and choose **Get Verified** on an unverified tool.
3. Confirm that its status changes to **Verification queued** and the button is removed.
4. Confirm one `tool_verification_requests` row exists with the tool, developer, `status = 'queued'`, and a current `submitted_at` value.
5. Try submitting the endpoint again. Expect HTTP 409 and no second active row.

The confirmation email must name the tool, state the 1–2 week SLA, and explain that publishing an update while queued or in review automatically cancels the request.

## Cancel on update

1. Leave the request queued, or open it from the admin queue so it becomes `in_review`.
2. Publish and process a valid new package version through the existing tool-update flow.
3. Confirm the active request changes to `cancelled` with `cancelled_reason = 'tool_updated_during_review'`.
4. Confirm the cancellation email names the tool, explains why the request was cancelled, and tells the developer they can resubmit for a full review.
5. Return to My Tools and submit again. Confirm a new queued row is created rather than the old row being reused.

Validation failures that do not update the published tool must not cancel the request.

## Rejection resubmission

After completing the rejection scenario in Phase 3, return to My Tools. **Get Verified** must be available and must create another complete queued request.
