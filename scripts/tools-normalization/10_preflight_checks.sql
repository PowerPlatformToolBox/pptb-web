select
    (select count(*) from public.tools) as tools_count,
    (select count(*) from public.tools_catalog) as catalog_count,
    (select count(*) from public.tools where current_release_id is null) as missing_current_release,
    (select count(*) from public.tool_releases) as releases_count;

select tool.id, tool.packagename, tool.current_release_id
from public.tools tool
left join public.tool_releases release on release.tool_id = tool.id and release.id = tool.current_release_id
where release.id is null;

select tool.id, tool.packagename
from public.tools tool
join public.tool_releases release on release.id = tool.current_release_id
where row(tool.version, tool.checksum, tool.size, tool.download, tool.icon, tool.readmeurl,
       tool.license, tool.csp_exceptions, coalesce(tool.min_api, tool.features->>'minAPI'), tool.max_api, tool.published_at)
    is distinct from
      row(release.version, release.checksum, release.size, release.download, release.icon, release.readme_url,
       release.license, release.csp_exceptions, release.min_api, release.max_api, release.published_at);

select tool.id, tool.packagename, tool.features as legacy_features,
     catalog.multi_connection, catalog.connection_requirement, catalog.enabled_for_power_platform_api
from public.tools tool
join public.tools_catalog catalog on catalog.id = tool.id
where tool.features->>'multiConnection' is distinct from catalog.multi_connection
  or tool.features->>'connectionRequirement' is distinct from catalog.connection_requirement
  or coalesce((tool.features->>'enabledForPowerPlatformAPI')::boolean, false) is distinct from catalog.enabled_for_power_platform_api;

select tool_id, count(*) as release_count
from public.tool_releases
group by tool_id having count(*) > 3;

select feature.release_id, feature.feature_key, feature.value
from public.tool_release_features feature
join public.tool_feature_definitions definition on definition.key = feature.feature_key
where (definition.value_type = 'boolean' and feature.value not in ('true', 'false'))
  or (definition.value_type = 'enum' and not (feature.value = any(definition.allowed_values)));

select tool.id, tool.packagename, catalog.mcp_enabled, catalog.maturity_status,
       coalesce(maturity.status, 'unverified') as expected_maturity
from public.tools tool
join public.tools_catalog catalog on catalog.id = tool.id
left join public.tool_maturity maturity on maturity.tool_id = tool.id
left join public.tool_release_features mcp on mcp.release_id = tool.current_release_id and mcp.feature_key = 'mcpEnabled'
where catalog.mcp_enabled is distinct from coalesce(mcp.value = 'true', false)
   or catalog.maturity_status is distinct from coalesce(maturity.status, 'unverified');

select role_name, has_table_privilege(role_name, 'public.tools_catalog', 'select') as catalog_select,
       has_table_privilege(role_name, 'public.tool_releases', 'select') as releases_select,
       has_table_privilege(role_name, 'public.tool_release_features', 'insert') as features_insert
from (values ('anon'), ('authenticated')) roles(role_name);

select schemaname, viewname
from pg_catalog.pg_views
where schemaname = 'public' and viewname <> 'tools_catalog'
  and definition ~* '(downloadurl|readmeurl|checksum|csp_exceptions|min_api|max_api|published_at|features)';

select namespace.nspname as schema_name, function_name.proname as function_name
from pg_catalog.pg_proc function_name
join pg_catalog.pg_namespace namespace on namespace.oid = function_name.pronamespace
where namespace.nspname = 'public'
  and function_name.proname not in ('sync_tool_release', 'validate_tool_release_feature')
  and function_name.prosrc ~* '(downloadurl|readmeurl|checksum|csp_exceptions|min_api|max_api|published_at|features)';