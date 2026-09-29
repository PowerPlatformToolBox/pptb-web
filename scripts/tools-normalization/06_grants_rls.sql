begin;

alter table public.tool_feature_definitions enable row level security;
alter table public.tool_releases enable row level security;
alter table public.tool_release_features enable row level security;

revoke all on public.tool_feature_definitions, public.tool_releases, public.tool_release_features from public, anon, authenticated;
revoke all on public.tools_catalog from public, anon, authenticated;

grant select on public.tool_feature_definitions, public.tool_releases, public.tool_release_features, public.tools_catalog to anon, authenticated;
grant all on public.tool_feature_definitions, public.tool_releases, public.tool_release_features, public.tools_catalog to service_role;

create policy read_tool_feature_definitions on public.tool_feature_definitions
for select to anon, authenticated using (true);

create policy read_tool_releases on public.tool_releases
for select to anon, authenticated using (
    exists (select 1 from public.tools where id = tool_id and status = 'active')
);

create policy read_tool_release_features on public.tool_release_features
for select to anon, authenticated using (
    exists (
        select 1 from public.tool_releases release
        join public.tools tool on tool.id = release.tool_id
        where release.id = release_id and tool.status = 'active'
    )
);

commit;