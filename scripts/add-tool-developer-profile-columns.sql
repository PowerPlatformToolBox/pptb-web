begin;

alter table public.user_profiles
    add column if not exists linkedin_profile_url text,
    add column if not exists discord_handle text,
    add column if not exists is_tool_developer boolean not null default false;

comment on column public.user_profiles.linkedin_profile_url is 'LinkedIn profile URL supplied by the user during tool submission.';
comment on column public.user_profiles.discord_handle is 'Optional Discord username supplied by the user during tool submission.';
comment on column public.user_profiles.is_tool_developer is 'True when the user has submitted a tool intake.';

update public.user_profiles as profile
set is_tool_developer = true
where exists (
    select 1
    from public.tool_intakes as intake
    where intake.submitted_by = profile.id
);

commit;