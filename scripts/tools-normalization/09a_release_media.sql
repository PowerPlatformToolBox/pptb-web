begin;

set local lock_timeout = '5s';

alter table public.tool_releases rename column download_url to download;
alter table public.tool_releases add column icon text;

update public.tool_releases release
set download = tool.download,
    icon = tool.icon,
    updated_at = now()
from public.tools tool
where release.tool_id = tool.id
  and release.id = tool.current_release_id
  and (release.download is distinct from tool.download or release.icon is distinct from tool.icon);

create or replace function public.sync_tool_release() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    synced_release_id uuid;
begin
    insert into public.tool_releases (
        tool_id, version, checksum, size, download, icon, readme_url, license,
        csp_exceptions, min_api, max_api, published_at
    ) values (
        new.id, new.version, new.checksum, new.size, new.download, new.icon, new.readmeurl,
        new.license, new.csp_exceptions, coalesce(new.min_api, new.features->>'minAPI'), new.max_api, new.published_at
    ) on conflict (tool_id, version) do update set
        checksum = excluded.checksum,
        size = excluded.size,
        download = excluded.download,
        icon = excluded.icon,
        readme_url = excluded.readme_url,
        license = excluded.license,
        csp_exceptions = excluded.csp_exceptions,
        min_api = excluded.min_api,
        max_api = excluded.max_api,
        published_at = excluded.published_at,
        updated_at = now()
    returning id into synced_release_id;

    delete from public.tool_release_features existing_feature
    where existing_feature.release_id = synced_release_id
      and feature_key in (
        select key from public.tool_feature_definitions where source = 'package.json'
      );

    insert into public.tool_release_features (release_id, feature_key, value)
    select synced_release_id, definition.key, feature.value
    from pg_catalog.jsonb_each_text(
        case when pg_catalog.jsonb_typeof(new.features) = 'object' then new.features else '{}'::jsonb end
    ) as feature(key, value)
    join public.tool_feature_definitions definition on definition.key = feature.key
    where definition.source = 'package.json' and feature.value is not null;

    update public.tools set current_release_id = synced_release_id where id = new.id;

    delete from public.tool_releases old_release
    where old_release.tool_id = new.id
      and old_release.id in (
        select id from public.tool_releases
        where tool_id = new.id and id <> synced_release_id
        order by published_at desc nulls last, created_at desc, id desc
        offset 2
      );

    return new;
end;
$$;

drop trigger sync_tool_release on public.tools;
create trigger sync_tool_release after insert or update of
    version, checksum, size, download, icon, readmeurl, license, csp_exceptions,
    features, min_api, max_api, published_at
on public.tools for each row execute function public.sync_tool_release();

commit;