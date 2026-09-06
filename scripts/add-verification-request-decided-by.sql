begin;

alter table public.tool_verification_requests
    add column if not exists decided_by uuid;

comment on column public.tool_verification_requests.decided_by is 'The admin who made the final approve/reject decision on this request.';

update public.tool_verification_requests
set decided_by = reviewed_by
where status in ('approved', 'rejected')
  and decided_by is null;

commit;
