-- Backfill flat tags into hierarchical taxonomy.
-- Notes:
-- 1) Existing flat tags have no explicit category metadata, so this script uses 'condition' as default category.
-- 2) Resulting taxonomy nodes are created under a single root category node per group.
-- 3) Re-categorization can be done later through taxonomy management APIs.

with target_groups as (
  select distinct t.group_id
  from tags t
), root_nodes as (
  insert into taxonomy_nodes (
    group_id,
    parent_id,
    name,
    normalized_name,
    category,
    icon_key,
    color,
    is_system_starter,
    created_by_user_id
  )
  select
    g.group_id,
    null,
    'condition',
    'condition',
    'condition',
    'condition-default',
    null,
    true,
    grp.created_by_user_id
  from target_groups g
  join groups grp on grp.id = g.group_id
  where not exists (
    select 1
    from taxonomy_nodes tn
    where tn.group_id = g.group_id
      and tn.parent_id is null
      and tn.normalized_name = 'condition'
      and tn.deleted_at is null
  )
  returning id, group_id
), existing_roots as (
  select tn.id, tn.group_id
  from taxonomy_nodes tn
  where tn.parent_id is null
    and tn.normalized_name = 'condition'
    and tn.deleted_at is null
), roots as (
  select id, group_id from root_nodes
  union
  select id, group_id from existing_roots
)
insert into taxonomy_nodes (
  group_id,
  parent_id,
  name,
  normalized_name,
  category,
  icon_key,
  color,
  is_system_starter,
  created_by_user_id
)
select
  t.group_id,
  r.id,
  t.name,
  t.normalized_name,
  'condition',
  'condition-default',
  t.color,
  false,
  grp.created_by_user_id
from tags t
join roots r on r.group_id = t.group_id
join groups grp on grp.id = t.group_id
where t.deleted_at is null
  and not exists (
    select 1
    from taxonomy_nodes tn
    where tn.group_id = t.group_id
      and tn.parent_id = r.id
      and tn.normalized_name = t.normalized_name
  );

-- Rebuild closure rows for all active taxonomy nodes.
delete from taxonomy_closure;

insert into taxonomy_closure (group_id, ancestor_id, descendant_id, depth)
select tn.group_id, tn.id, tn.id, 0
from taxonomy_nodes tn
where tn.deleted_at is null;

with recursive closure_walk as (
  select
    tn.group_id,
    tn.parent_id as ancestor_id,
    tn.id as descendant_id,
    1 as depth
  from taxonomy_nodes tn
  where tn.parent_id is not null
    and tn.deleted_at is null

  union all

  select
    cw.group_id,
    parent.parent_id as ancestor_id,
    cw.descendant_id,
    cw.depth + 1
  from closure_walk cw
  join taxonomy_nodes parent on parent.id = cw.ancestor_id
  where parent.parent_id is not null
    and parent.deleted_at is null
)
insert into taxonomy_closure (group_id, ancestor_id, descendant_id, depth)
select group_id, ancestor_id, descendant_id, depth
from closure_walk
where ancestor_id is not null
on conflict (ancestor_id, descendant_id) do update
set depth = excluded.depth;

-- Backfill place-tag links.
insert into place_taxonomy_tags (place_id, taxonomy_node_id, created_at, deleted_at, version)
select
  pt.place_id,
  tn.id,
  pt.created_at,
  pt.deleted_at,
  pt.version
from place_tags pt
join tags t on t.id = pt.tag_id
join taxonomy_nodes root on root.group_id = t.group_id
  and root.parent_id is null
  and root.normalized_name = 'condition'
  and root.deleted_at is null
join taxonomy_nodes tn on tn.group_id = t.group_id
  and tn.parent_id = root.id
  and tn.normalized_name = t.normalized_name
on conflict (place_id, taxonomy_node_id) do nothing;
