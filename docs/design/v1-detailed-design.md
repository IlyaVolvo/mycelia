# Mycelia v1 Detailed Design

## Decisions Locked
- Mobile app: Flutter.
- Backend API: Node.js + Fastify.
- Database: Neon Postgres + PostGIS.
- Auth: Clerk.
- Storage: Cloudflare R2 for photos, Neon for metadata.
- Map provider: Google Maps.
- Offline model: local-first with queued sync operations.

## Scope
- Create places from current GPS, map tap, or photo EXIF.
- Attach name, description, and optional observed date.
- Maintain reusable tags and assign tags to places.
- Create saved filters from tags/date constraints.
- Show filtered places on map with zoom and clustering.
- Build trails between places.
- Open directions to a selected cluster target.
- Notify when close to marked places (on-device geofencing).
- Import and export places (GeoJSON + CSV).

## Initial Architecture
Client:
- Flutter UI with map-first screen as entry point.
- SQLite local store for offline state.
- Sync engine for push/pull operations.

Backend:
- Fastify REST API.
- Neon as primary data store.
- R2 signed uploads for photo binaries.

Data:
- Soft-delete and version fields for sync-safe mutations.
- PostGIS geography index for nearby search.

## First Implementation Slice (M1)
- API bootstrap and typed config.
- Core schema migration.
- Group creation endpoint.
- Place creation endpoint.
- Nearby places query endpoint.
- Health endpoint with DB liveness check.

## Current Priority Order (User-Driven)
1. Application-level tags and filters UX/data flows.
2. API-first roadmap for tags/filters and dedup behavior.
3. Proximity notifications, authentication/authorization, sharing, and import/export decisions later.
4. Conflict resolution as the last feature, kept intentionally simple.

## Tags and Filters Decisions (Locked)
- Tag model: hierarchical-capable taxonomy with parent-child relationships in storage.
- v1 UX posture: keep interaction simple and optimized for one to two levels.
- Depth policy for v1: deeper levels are allowed, but creation/edit controls are hidden behind explicit advanced actions.
- Non-clutter rule: default tag creation and filtering surfaces show only level 1 and level 2 paths.
- Advanced taxonomy permissions in v1: advanced hierarchy controls are available to group owners/editors only.
- Level-1 category policy for v1 UX: category is required for all newly created tags.
- Category count for v1: minimal set of 4 required categories.
- Initial v1 categories: species, terrain, condition, season.
- Filter semantics: selecting a parent tag includes all descendants.
- Filter expansion control policy in v1: always-on descendant expansion with no user toggle.
- Parent-descendant overlap policy in v1: auto-deduplicate silently (parent selection subsumes descendants).
- Visualization: tag icon support included in v1 data model and UI.
- Icon strategy for v1: curated built-in icon set (no custom uploads in v1).
- Icon catalog size for v1: medium set (32-48 icons), grouped by category.
- Icon assignment policy for v1: icon selection is optional; if user skips, app auto-assigns category default icon.
- Category default policy for v1: one canonical default icon per category.
- Guardrails accepted:
	- normalize tags for uniqueness,
	- reject duplicates per group,
	- keep a small default category set,
	- support recategorization without breaking place-tag links.

## Starter Data Policy (Current Direction)
- App includes publicly available starter tags distributed with the app.
- Group starts with empty personal tag list until user imports/enables starter tags during onboarding.
- This keeps first-run state clean while still providing discoverable defaults.

## Deferred for Later Design Iterations
- Authentication and authorization behavior details.
- Sharing model behavior details.
- Import/export UX details.
- Proximity alert policy and device constraints.
- Advanced conflict visibility UX.

## Terminology
- Location: primary unit pinned on map coordinates with optional name/description/date fields.
- User taxonomy tag: user-defined hierarchical tag associated with a location.
- Parent tag: higher-level taxonomy node used for broad filtering.
- Descendant tag: child or deeper node under a parent tag.
- System facet: optional system-defined metadata (date, time, condition, temperature) attached to a location.
- Facet definition: programmatically managed schema for a system facet, enabling future rich semantics.

## System Facets Direction
- System facets are optional and extensible programmatically.
- v1 starts with expanded auto-captured facets and allows adding new facet definitions in code.
- v1 facet interaction policy: read-only for users and auto-captured by the system.
- v1 UX rule: facets are displayed as context chips/details and are not user-editable.
- v1 facet baseline set:
	- observed_date
	- observed_time
	- weather_condition
	- temperature_c
	- gps_accuracy_m
	- altitude_m (when available)
- Missing-data policy for v1 facets:
	- weather_condition and temperature_c may be null,
	- app shows a subtle availability indicator instead of warnings,
	- indicator is shown in place detail only,
	- no external weather API fallback in v1.
- Rich semantic associations are a planned extension and do not block v1 UX.

## Conflict Handling Posture
- Conflict resolution remains intentionally simple for v1 and implemented late.
- Last-writer-wins with lightweight audit visibility is sufficient for expected rarity.

## Open Follow-Ups (Non-Blocking)
- Final geofencing plugin selection after device spike.
- GPX support decision for post-v1 extension.

## Companion Documents
- Flow specification: `docs/design/v1-flows.md`
- Flutter UX contract: `docs/design/v1-flutter-ux-contract.md`
- Neon schema delta: `docs/design/v1-neon-schema-delta.md`
- API contract: `docs/design/v1-api-contract.md`
