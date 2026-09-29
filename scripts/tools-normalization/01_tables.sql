begin;

set local lock_timeout = '5s';

create table public.tool_feature_definitions (
    key text primary key,
    label text not null,
    value_type text not null check (value_type in ('boolean', 'enum')),
    allowed_values text[] null,
    source text not null check (source in ('package.json', 'pptb.config.json')),
    filterable boolean not null default false,
    sort_order integer not null default 0,
    constraint tool_feature_definition_values_check check (
        (value_type = 'boolean' and allowed_values is null)
        or (value_type = 'enum' and allowed_values is not null and cardinality(allowed_values) > 0)
    )
);

create table public.tool_releases (
    id uuid primary key default gen_random_uuid(),
    tool_id uuid not null references public.tools(id) on delete cascade,
    version text not null,
    checksum text null,
    size text null,
    download text null,
    icon text null,
    readme_url text null,
    license text null,
    csp_exceptions jsonb null,
    min_api text null,
    max_api text null,
    published_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint tool_releases_tool_version_key unique (tool_id, version),
    constraint tool_releases_tool_id_id_key unique (tool_id, id)
);

create index tool_releases_recent_idx on public.tool_releases (tool_id, published_at desc nulls last, created_at desc, id desc);

alter table public.tools add column current_release_id uuid null;

alter table public.tools add constraint tools_current_release_same_tool_fkey
    foreign key (id, current_release_id) references public.tool_releases(tool_id, id)
    deferrable initially deferred;

create table public.tool_release_features (
    release_id uuid not null references public.tool_releases(id) on delete cascade,
    feature_key text not null references public.tool_feature_definitions(key),
    value text not null,
    primary key (release_id, feature_key)
);

create index tool_release_features_filter_idx on public.tool_release_features (feature_key, value, release_id);

alter table public.tool_intakes add column mcp_enabled boolean not null default false;

commit;