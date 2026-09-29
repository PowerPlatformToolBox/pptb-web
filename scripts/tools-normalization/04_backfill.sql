begin;

set local lock_timeout = '5s';

with batch as (
    select id from public.tools
    where current_release_id is null
    order by id
    limit 100
    for update skip locked
)
update public.tools as tool
set version = tool.version
from batch
where tool.id = batch.id;

commit;

select count(*) as remaining_tools_to_backfill
from public.tools where current_release_id is null;