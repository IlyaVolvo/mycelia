-- Hierarchical taxonomy and system facets for v1 tags/filters UX contract.

create table if not exists taxonomy_nodes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  parent_id uuid references taxonomy_nodes(id) on delete cascade,
  name text not null check (name <> ''),
  normalized_name text not null check (normalized_name <> ''),
  category text not null check (category in ('species', 'terrain', 'condition', 'season')),
  icon_key text not null,
  color text,
  is_system_starter boolean not null default false,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1,
  check (parent_id is null or parent_id <> id),
  unique (group_id, parent_id, normalized_name)
);

create index if not exists idx_taxonomy_nodes_group on taxonomy_nodes(group_id);
create index if not exists idx_taxonomy_nodes_parent on taxonomy_nodes(parent_id);
create index if not exists idx_taxonomy_nodes_group_active
  on taxonomy_nodes(group_id)
  where deleted_at is null;

create table if not exists taxonomy_closure (
  group_id uuid not null references groups(id) on delete cascade,
  ancestor_id uuid not null references taxonomy_nodes(id) on delete cascade,
  descendant_id uuid not null references taxonomy_nodes(id) on delete cascade,
  depth int not null check (depth >= 0),
  primary key (ancestor_id, descendant_id)
);

create index if not exists idx_taxonomy_closure_desc on taxonomy_closure(descendant_id);
create index if not exists idx_taxonomy_closure_group_anc on taxonomy_closure(group_id, ancestor_id);

create table if not exists place_taxonomy_tags (
  place_id uuid not null references places(id) on delete cascade,
  taxonomy_node_id uuid not null references taxonomy_nodes(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1,
  primary key (place_id, taxonomy_node_id)
);

create index if not exists idx_place_taxonomy_place on place_taxonomy_tags(place_id);
create index if not exists idx_place_taxonomy_node on place_taxonomy_tags(taxonomy_node_id);
create index if not exists idx_place_taxonomy_active
  on place_taxonomy_tags(place_id, taxonomy_node_id)
  where deleted_at is null;

create table if not exists system_facet_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_type text not null check (value_type in ('date', 'time', 'number', 'enum', 'string', 'boolean')),
  unit text,
  enum_values jsonb,
  semantic_hint text,
  is_active boolean not null default true,
  is_user_editable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists place_system_facet_values (
  place_id uuid not null references places(id) on delete cascade,
  facet_definition_id uuid not null references system_facet_definitions(id) on delete cascade,
  value_json jsonb not null,
  captured_at timestamptz not null default now(),
  source text not null default 'device',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (place_id, facet_definition_id)
);

create index if not exists idx_place_facet_place on place_system_facet_values(place_id);
create index if not exists idx_place_facet_facet on place_system_facet_values(facet_definition_id);

create table if not exists saved_filters (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  criteria_json jsonb not null,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_saved_filters_group_active
  on saved_filters(group_id, updated_at desc)
  where deleted_at is null;

insert into system_facet_definitions (key, value_type, unit, enum_values, semantic_hint, is_user_editable)
values
  ('observed_date', 'date', null, null, 'Observation date', false),
  ('observed_time', 'time', null, null, 'Observation time', false),
  (
    'weather_condition',
    'enum',
    null,
    '["sunny", "cloudy", "rain", "snow", "fog", "windy", "unknown"]'::jsonb,
    'Weather label near observation',
    false
  ),
  ('temperature_c', 'number', 'celsius', null, 'Ambient temperature in Celsius', false),
  ('gps_accuracy_m', 'number', 'meters', null, 'GPS reported horizontal accuracy', false),
  ('altitude_m', 'number', 'meters', null, 'Altitude if available', false)
on conflict (key) do nothing;
