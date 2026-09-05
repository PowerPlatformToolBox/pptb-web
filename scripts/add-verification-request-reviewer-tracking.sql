begin;

alter table public.tool_verification_requests
    add column if not exists reviewer_ids uuid[] not null default '{}';

comment on column public.tool_verification_requests.reviewer_ids is 'All distinct admin user IDs who have opened, saved a draft on, or decided this request.';

update public.tool_verification_requests
set reviewer_ids = array[reviewed_by]
where reviewed_by is not null
  and reviewer_ids = '{}';

commit;
