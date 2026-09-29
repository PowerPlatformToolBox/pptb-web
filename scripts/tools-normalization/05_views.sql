begin;

create view public.tools_catalog with (security_invoker = true) as
select
    tool.id,
    tool.packagename,
    tool.name,
    tool.description,
    tool.website,
    tool.repository,
    tool.status,
    tool.user_id,
    tool.created_at,
    tool.updated_at,
    release.version,
    release.checksum,
    release.size,
    release.download,
    release.icon,
    release.readme_url,
    release.license,
    release.csp_exceptions,
    release.min_api,
    release.max_api,
    release.published_at,
    multi_connection.value as multi_connection,
    connection_requirement.value as connection_requirement,
    coalesce(power_platform_api.value = 'true', false) as enabled_for_power_platform_api,
    coalesce(mcp.value = 'true', false) as mcp_enabled,
    coalesce(maturity.status, 'unverified') as maturity_status
from public.tools tool
left join public.tool_releases release on release.id = tool.current_release_id and release.tool_id = tool.id
left join public.tool_release_features multi_connection on multi_connection.release_id = release.id and multi_connection.feature_key = 'multiConnection'
left join public.tool_release_features connection_requirement on connection_requirement.release_id = release.id and connection_requirement.feature_key = 'connectionRequirement'
left join public.tool_release_features power_platform_api on power_platform_api.release_id = release.id and power_platform_api.feature_key = 'enabledForPowerPlatformAPI'
left join public.tool_release_features mcp on mcp.release_id = release.id and mcp.feature_key = 'mcpEnabled'
left join public.tool_maturity maturity on maturity.tool_id = tool.id;

commit;