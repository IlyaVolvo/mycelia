# Mycelia v1 Neon Schema Delta

This document defines database changes required to move from the current baseline schema to the finalized v1 taxonomy and facet model.

## 1) Goals
- Support hierarchical-capable user taxonomy tags.
- Keep default UX simple (1-2 levels), while allowing deeper levels via advanced controls.
- Support read-only, auto-captured system facets with extensible definitions.
- Enable parent filter semantics that include descendants.

## 2) Baseline Assumptions
- Existing tables include `places`, `groups`, `group_memberships`, and flat tag tables (`tags`, `place_tags`).
- Existing soft-delete/version strategy remains unchanged.

## 3) New Tables

### 3.1 taxonomy_nodes
Represents hierarchical user-defined taxonomy entries.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `group_id uuid not null references groups(id) on delete cascade`
- `parent_id uuid null references taxonomy_nodes(id) on delete cascade`
- `name text not null`
- `normalized_name text not null`
- `category text not null`  -- required in v1 (`species`, `terrain`, `condition`, `season`)
- `icon_key text not null`  -- curated icon ID
- `color text null`
- `is_system_starter boolean not null default false`
- `created_by_user_id uuid not null references users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`
- `version bigint not null default 1`

Constraints:
- `check (name <> '')`
- `check (normalized_name <> '')`
- `check (category in ('species','terrain','condition','season'))`
- `check (parent_id is null or parent_id <> id)`
- `unique (group_id, parent_id, normalized_name)`  -- sibling-level uniqueness

Indexes:
- `idx_taxonomy_nodes_group on taxonomy_nodes(group_id)`
- `idx_taxonomy_nodes_parent on taxonomy_nodes(parent_id)`
- `idx_taxonomy_nodes_group_active on taxonomy_nodes(group_id) where deleted_at is null`

### 3.2 taxonomy_closure
Stores ancestor-descendant relationships for fast descendant expansion.

Columns:
- `group_id uuid not null references groups(id) on delete cascade`
- `ancestor_id uuid not null references taxonomy_nodes(id) on delete cascade`
- `descendant_id uuid not null references taxonomy_nodes(id) on delete cascade`
- `depth int not null`  -- 0 self, 1 child, etc.

Primary key:
- `(ancestor_id, descendant_id)`

Constraints:
- `check (depth >= 0)`

Indexes:
- `idx_taxonomy_closure_desc on taxonomy_closure(descendant_id)`
- `idx_taxonomy_closure_group_anc on taxonomy_closure(group_id, ancestor_id)`

Notes:
- Populate and maintain via transaction-safe insert/delete logic in API service.
- This table makes parent filter expansion deterministic and efficient.

### 3.3 place_taxonomy_tags
Associates places with taxonomy nodes.

Columns:
- `place_id uuid not null references places(id) on delete cascade`
- `taxonomy_node_id uuid not null references taxonomy_nodes(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `deleted_at timestamptz null`
- `version bigint not null default 1`

Primary key:
- `(place_id, taxonomy_node_id)`

Indexes:
- `idx_place_taxonomy_place on place_taxonomy_tags(place_id)`
- `idx_place_taxonomy_node on place_taxonomy_tags(taxonomy_node_id)`
- `idx_place_taxonomy_active on place_taxonomy_tags(place_id, taxonomy_node_id) where deleted_at is null`

### 3.4 system_facet_definitions
Programmatically managed registry for system facets.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `key text not null unique`  -- `observed_date`, `temperature_c`, etc.
- `value_type text not null`  -- `date`, `time`, `number`, `enum`, `string`
- `unit text null`  -- `celsius`, `meters`, etc.
- `enum_values jsonb null`
- `semantic_hint text null`
- `is_active boolean not null default true`
- `is_user_editable boolean not null default false`  -- false in v1
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- `check (value_type in ('date','time','number','enum','string','boolean'))`

### 3.5 place_system_facet_values
Actual facet values attached to places.

Columns:
- `place_id uuid not null references places(id) on delete cascade`
- `facet_definition_id uuid not null references system_facet_definitions(id) on delete cascade`
- `value_json jsonb not null`
- `captured_at timestamptz not null default now()`
- `source text not null default 'device'`  -- `device`, `server_enrichment`, etc.
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Primary key:
- `(place_id, facet_definition_id)`

Indexes:
- `idx_place_facet_place on place_system_facet_values(place_id)`
- `idx_place_facet_facet on place_system_facet_values(facet_definition_id)`

## 4) Seed Data (v1)

### Required root categories
Create 4 top-level category nodes per group:
- species
- terrain
- condition
- season

These are represented as `taxonomy_nodes` roots (`parent_id is null`) and may be imported during starter onboarding.

### Facet definition seeds
Create active definitions:
- `observed_date` (`date`)
- `observed_time` (`time`)
- `weather_condition` (`enum`, values set in `enum_values`)
- `temperature_c` (`number`, unit `celsius`)
- `gps_accuracy_m` (`number`, unit `meters`)
- `altitude_m` (`number`, unit `meters`)

All seeded facets must have `is_user_editable = false` in v1.

## 5) Migration Steps
1. Create new tables and indexes.
2. Backfill `taxonomy_nodes` from existing `tags` (level-2 under mapped category roots).
3. Backfill `place_taxonomy_tags` from `place_tags`.
4. Backfill/seed `system_facet_definitions`.
5. Keep old `tags`/`place_tags` as compatibility read path during transition (optional short phase).
6. Switch API reads/writes to new taxonomy tables.
7. Remove deprecated flat-tag tables in a later cleanup migration.

## 6) Query Semantics

### Parent expansion (always on)
- If parent node selected, include all descendants via `taxonomy_closure`.

### Overlap deduplication
- If both ancestor and descendant are selected, collapse to ancestor semantics.
- Dedup performed in service-layer filter compiler before SQL execution.

### Example filter strategy
1. Normalize selected node IDs.
2. Remove selected nodes whose ancestor is already selected.
3. Expand remaining selected parents to descendant sets using closure table.
4. Query places by resulting node ID set.

## 7) Integrity Rules
- API must prevent cross-group parent-child links.
- API must prevent taxonomy cycles (closure insert logic should reject illegal moves).
- Soft-deleted taxonomy nodes are excluded from active filter selection.
- Viewer role cannot mutate taxonomy (enforced in API auth layer).

## 8) Out of Scope for This Delta
- Conflict-merge sophistication beyond current LWW posture.
- Dynamic user-defined facet definitions in v1 UI.
- Weather API enrichment fallback.
