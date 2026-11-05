create extension if not exists postgis;
create extension if not exists pgcrypto;

do $$ begin
  create type membership_role as enum ('owner', 'editor', 'viewer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type place_source as enum ('gps', 'tap', 'exif', 'import');
exception
  when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists group_memberships (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role membership_role not null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  description text,
  observed_date date,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geom geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  source_type place_source not null default 'tap',
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

create index if not exists idx_places_geom on places using gist(geom);
create index if not exists idx_places_group_updated on places(group_id, updated_at desc);
create index if not exists idx_places_group_active on places(group_id) where deleted_at is null;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(group_id, normalized_name)
);

create table if not exists place_tags (
  place_id uuid not null references places(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1,
  primary key (place_id, tag_id)
);

create table if not exists trails (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  notes text,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

create table if not exists trail_waypoints (
  trail_id uuid not null references trails(id) on delete cascade,
  seq_no integer not null check (seq_no > 0),
  place_id uuid not null references places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trail_id, seq_no)
);
