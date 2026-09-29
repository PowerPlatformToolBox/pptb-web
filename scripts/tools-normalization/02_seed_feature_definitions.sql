begin;

insert into public.tool_feature_definitions (key, label, value_type, allowed_values, source, filterable, sort_order)
values
    ('multiConnection', 'Multi-connection', 'enum', array['required', 'optional', 'none'], 'package.json', true, 10),
    ('connectionRequirement', 'Connection requirement', 'enum', array['required', 'optional'], 'package.json', false, 20),
    ('enabledForPowerPlatformAPI', 'Power Platform API', 'boolean', null, 'package.json', true, 30),
    ('mcpEnabled', 'MCP Enabled', 'boolean', null, 'pptb.config.json', true, 40)
on conflict (key) do update set
    label = excluded.label,
    value_type = excluded.value_type,
    allowed_values = excluded.allowed_values,
    source = excluded.source,
    filterable = excluded.filterable,
    sort_order = excluded.sort_order;

commit;