select
    (select count(*) from public.tools) as tools_count,
    (select count(*) from public.tools_catalog) as catalog_count,
    (select count(*) from public.tools where current_release_id is null) as missing_current_release;

select tool.id, tool.packagename, tool.current_release_id
from public.tools tool
left join public.tool_releases release on release.tool_id = tool.id and release.id = tool.current_release_id
where release.id is null;

select release.tool_id, count(*) as release_count
from public.tool_releases release
group by release.tool_id having count(*) > 3;

select tool.id, tool.packagename
from public.tools tool
join public.tools_catalog catalog on catalog.id = tool.id
left join public.tool_maturity maturity on maturity.tool_id = tool.id
left join public.tool_release_features mcp on mcp.release_id = tool.current_release_id and mcp.feature_key = 'mcpEnabled'
where catalog.mcp_enabled is distinct from coalesce(mcp.value = 'true', false)
   or catalog.maturity_status is distinct from coalesce(maturity.status, 'unverified');

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'tools'
  and column_name in ('version', 'checksum', 'size', 'download', 'icon', 'downloadurl', 'readmeurl', 'license',
                      'csp_exceptions', 'features', 'min_api', 'max_api', 'published_at');

select trigger_name
from information_schema.triggers
where event_object_schema = 'public' and event_object_table = 'tools'
  and trigger_name = 'sync_tool_release';

select role_name, has_table_privilege(role_name, 'public.tools_catalog', 'select') as catalog_select,
       has_table_privilege(role_name, 'public.tool_release_features', 'insert') as features_insert
from (values ('anon'), ('authenticated')) roles(role_name);