# Mycelia

Map-first mushroom places app using Flutter (client), Fastify (API), and Neon Postgres + PostGIS (database).

## Repository Layout

- apps/api: Fastify backend
- db/migrations: SQL migrations for Neon
- docs/design: design documents

## Prerequisites

- Node.js 20+
- npm 10+
- Neon database with PostGIS support

## API Setup

1. Copy environment template:

   cp apps/api/.env.example apps/api/.env

2. Update DATABASE_URL in apps/api/.env.

3. Apply migrations to Neon in this exact order:

   - db/migrations/0001_init.sql
   - db/migrations/0002_taxonomy_and_facets.sql
   - db/migrations/0003_backfill_flat_tags_to_taxonomy.sql

4. Install dependencies (if needed):

   npm --prefix apps/api install

5. Run API in development:

   npm run dev:api

## Build

Build API:

npm run build:api

## Implemented Endpoints (M1)

- GET /health
- POST /v1/groups
- POST /v1/places
- GET /v1/places/nearby

## Notes

- Current API uses basic payload validation and does not yet enforce Clerk JWT auth.
- Next milestone adds users bootstrap, auth middleware, and group-role authorization checks.

## Migration Rollback Notes

- Migrations are additive, but 0003_backfill_flat_tags_to_taxonomy.sql performs data backfill and marks old `place_tags` rows as soft-deleted.
- Rolling back after running 0003 does not automatically reconstruct pre-backfill state in `place_tags.deleted_at`; plan data restoration before destructive rollback.
- Safe rollback strategy:
   - Take a full Neon branch/snapshot before applying 0003.
   - Validate row counts for `place_taxonomy_tags` and `taxonomy_nodes` after backfill.
   - If rollback is needed, restore from snapshot (preferred) instead of manual inverse SQL.
