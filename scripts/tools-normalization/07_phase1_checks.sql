select
    (select count(*) from public.tools) as tools_count,
    (select count(*) from public.tool_releases) as releases_count,
    (select count(*) from public.tools_catalog) as catalog_count,
    (select count(*) from public.tools where current_release_id is null) as missing_current_release;

select tool.id, tool.packagename, tool.version, release.version as release_version
from public.tools tool
left join public.tool_releases release on release.id = tool.current_release_id and release.tool_id = tool.id
where release.id is null or tool.version is distinct from release.version;

select tool.id, tool.packagename, tool.download as legacy_download, catalog.download as release_download,
         tool.icon as legacy_icon, catalog.icon as release_icon
from public.tools tool
join public.tools_catalog catalog on catalog.id = tool.id
where tool.download is distinct from catalog.download
    or tool.icon is distinct from catalog.icon;

select tool.id, tool.packagename, tool.features as legacy_features, tool.min_api as legacy_min_api,
         catalog.min_api as release_min_api, catalog.multi_connection, catalog.connection_requirement,
         catalog.enabled_for_power_platform_api
from public.tools tool
join public.tools_catalog catalog on catalog.id = tool.id
where coalesce(tool.min_api, tool.features->>'minAPI') is distinct from catalog.min_api
    or tool.features->>'multiConnection' is distinct from catalog.multi_connection
    or tool.features->>'connectionRequirement' is distinct from catalog.connection_requirement
    or coalesce((tool.features->>'enabledForPowerPlatformAPI')::boolean, false) is distinct from catalog.enabled_for_power_platform_api;

select release.tool_id, count(*) as release_count
from public.tool_releases release
group by release.tool_id
having count(*) > 3;

select feature.release_id, feature.feature_key, feature.value
from public.tool_release_features feature
join public.tool_feature_definitions definition on definition.key = feature.feature_key
where (definition.value_type = 'boolean' and feature.value not in ('true', 'false'))
    or (definition.value_type = 'enum' and not (feature.value = any(definition.allowed_values)));