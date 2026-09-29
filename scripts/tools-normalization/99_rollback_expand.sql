begin;

set local lock_timeout = '5s';

do $$
begin
    if exists (
        select 1 from public.tool_release_features where feature_key = 'mcpEnabled'
    ) or exists (
        select 1 from public.tool_releases group by tool_id having count(*) > 1
    ) then
        raise exception 'Normalized MCP or historical release data exists; do not roll back the additive schema';
    end if;
end;
$$;

drop view public.tools_catalog;
drop trigger sync_tool_release on public.tools;
drop trigger validate_tool_release_feature on public.tool_release_features;
drop function public.sync_tool_release();
drop function public.validate_tool_release_feature();
alter table public.tools drop constraint tools_current_release_same_tool_fkey;
alter table public.tools drop column current_release_id;
alter table public.tool_intakes drop column mcp_enabled;
drop table public.tool_release_features;
drop table public.tool_releases;
drop table public.tool_feature_definitions;

commit;