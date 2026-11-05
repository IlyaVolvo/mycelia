# Mycelia v1 Flows

This document defines end-to-end user and system flows for v1.

## Implementation Sequence for Current Phase
1. Build and refine Tags and Filters UX/data flows first.
2. Implement API-first roadmap next for tags/filters and dedup support.
3. Defer proximity notifications, auth/authorization, sharing, and import/export to later iterations.
4. Keep conflict resolution simple and implement it last.

## 1. Auth and Group Setup

### Primary flow
1. User opens app.
2. User signs in via Clerk.
3. App fetches user groups.
4. User chooses one group, or creates a new group.
5. App opens map centered on last known location.

### Alternate flow: user has no group
1. App shows Create Group CTA.
2. User enters group name.
3. App calls `POST /v1/groups`.
4. API creates group and owner membership.
5. App stores selected group locally.

### Failure flow
1. Sign-in fails or token expired.
2. App clears stale session and shows login.

## 2. Map Home and Initial Data Load

### Primary flow
1. App reads local cached places for selected group.
2. App renders cached markers immediately.
3. Sync engine starts pull from server checkpoint.
4. App updates markers as deltas arrive.

### Offline flow
1. No network available.
2. App continues with local cache only.
3. Banner shows Offline mode.

## System Facets Display Behavior (v1)
1. System facets are auto-captured where available.
2. Baseline auto-captured set includes observed_date, observed_time, weather_condition, temperature_c, gps_accuracy_m, and altitude_m (when available).
3. Facets are shown as read-only context in place details.
4. User cannot edit facet values in v1.
5. Missing facet values are allowed and do not block place creation.
6. If weather_condition or temperature_c is missing, app shows a subtle availability indicator (not an error state).
7. No weather API fallback is used in v1.
8. Availability indicator appears in place detail only (not on map markers or list rows).

## 3. Create Place From Current Location

### Primary flow
1. User taps Add Place -> Current Location.
2. App requests location permission if needed.
3. App captures coordinates and accuracy.
4. User enters name, optional description/date.
5. App writes place locally and enqueues sync op.
6. Marker appears immediately.

### Failure flow
1. Permission denied.
2. App offers fallback: Mark on map.

## 4. Create Place From Map Tap

### Primary flow
1. User long-presses map.
2. App shows draft pin with coordinate.
3. User enters place fields and saves.
4. App writes locally and enqueues create op.

## 5. Create Place From Photo EXIF

### Primary flow
1. User taps Add Place -> From Photo.
2. App reads EXIF metadata on device.
3. If EXIF GPS exists, app pre-fills coordinates.
4. User confirms details and saves.
5. App enqueues place create and photo upload flow.

### Alternate flow: EXIF missing
1. App prompts user to place pin manually.
2. User taps map to set location.
3. Save continues as normal.

## 6. Manage Tags

### UX boundary for v1
1. Data model supports hierarchical tags.
2. UI editing is intentionally constrained to one or two visible levels for clarity.
3. Deeper-level creation is available only via explicit advanced action.
4. Default create/edit/filter views stay focused on 1-2 levels and do not expose deep-tree controls.

### Primary flow: create tag
1. User opens Tags.
2. User creates tag name and selects required category from: species, terrain, condition, season.
3. User optionally selects icon and color from built-in curated options.
4. If no icon is selected, app auto-applies the single canonical default icon for selected category.
5. Icon picker defaults to category-matched suggestions from a medium set (32-48 icons).
6. App validates normalized uniqueness in group scope.
7. App writes locally and enqueues create tag op.

### Alternate flow: create deeper-level tag (advanced)
1. Owner/editor opens advanced taxonomy controls.
2. User selects parent path and adds deeper child.
3. App confirms resulting full path preview before save.
4. Deeper nodes remain usable in filtering, while default UI still highlights 1-2 levels.

### Authorization rule
1. Viewer-level users cannot access advanced taxonomy controls.
2. Viewer-level users can still apply existing deep tags in filtering and view assigned tags on places.

### Primary flow: starter tag onboarding
1. On first open of Tags, app offers starter public tags.
2. User can import all, import by category, or skip.
3. Imported starter tags become editable group tags.
4. If skipped, group tag list remains empty until user creates/imports tags.

### Primary flow: assign tag to place
1. User opens place detail.
2. User selects existing tags.
3. App upserts `place_tags` locally and queues sync.

### Validation flow
1. Duplicate tag name in same group is rejected.
2. App shows readable error and suggested rename.
3. Missing category is rejected for new tags.
4. Unsupported custom icon upload is rejected in v1.

## 7. Filters and Filtered Map

### Primary flow
1. User opens filter panel.
2. User selects include/exclude tags and optional dates.
3. If user selects a parent tag, filter automatically includes all descendant tags.
4. Descendant expansion is always on in v1 and has no toggle in filter UI.
5. App saves filter preset.
6. Map rerenders with only matching places.

### Hierarchical behavior notes
1. Parent selections are the simple broad-filter shortcut.
2. User can still select specific child tags for narrower filtering.
3. Parent expansion is deterministic and visible in filter summary.
4. If both parent and descendant are selected, system silently deduplicates by keeping parent semantics.

### Zoom behavior
1. At low zoom, app clusters markers.
2. At high zoom, app expands to individual markers.

## 8. Directions to Cluster

### Primary flow
1. User taps a cluster.
2. App computes target place nearest cluster centroid.
3. User taps Navigate.
4. App opens Google Maps deep link.

### Failure flow
1. Google Maps unavailable.
2. App shows plain coordinate copy/open-in-browser fallback.

## 9. Create Trail Between Places

### Primary flow
1. User taps Create Trail.
2. User selects ordered places from map/list.
3. App creates trail and trail waypoints locally.
4. App renders polyline on map.
5. Sync engine pushes trail ops.

### Edit flow
1. User reorders/removes waypoints.
2. App updates `seq_no` locally and enqueues update ops.

## 10. Proximity Notifications

### Primary flow
1. User enables alert for place with radius.
2. App registers geofence locally.
3. Enter event fires in background.
4. App checks cooldown and emits notification.
5. App stores `last_triggered_at` locally and syncs later.

### Failure flow
1. Background location denied.
2. App disables alerts and shows remediation steps.

## 11. Import Places (GeoJSON/CSV)

### Primary flow
1. User picks file.
2. App uploads file or parses locally (format-dependent).
3. API validates schema and normalizes data.
4. API runs dedupe heuristics.
5. User reviews summary and confirms.
6. Import commits and map refreshes.

### Failure flow
1. Invalid rows found.
2. Job report returns row-level errors.
3. User can download error report and retry.

## 12. Export Places (GeoJSON/CSV)

### Primary flow
1. User selects export scope: all or filtered.
2. App requests export job.
3. API produces artifact and signed URL.
4. User shares/saves exported file.

## 13. Offline Sync and Conflict Handling

### Primary flow
1. While offline, user creates/edits/deletes entities.
2. App appends operations to durable queue.
3. On reconnect, app pushes queued ops with idempotency keys.
4. Server applies accepted ops and returns conflicts.
5. App applies pull deltas and advances checkpoint.

### Conflict flow
1. Same entity edited on two devices.
2. Server applies field-level last-writer-wins.
3. Conflict log entry is created.
4. App shows conflict in review screen for user visibility.

### Current policy for implementation order
1. Conflict flow is postponed until core tags/filters and API contracts are stable.
2. First conflict implementation remains minimal: last-writer-wins plus optional audit log.
3. Conflict UX remains intentionally lightweight because conflicts are expected to be rare.

## 14. Minimal API to Support These Flows
- `POST /v1/groups`
- `POST /v1/places`
- `GET /v1/places/nearby`
- `GET/POST /v1/groups/{groupId}/tags`
- `POST/DELETE /v1/groups/{groupId}/places/{placeId}/tags/{tagId}`
- `GET/POST /v1/groups/{groupId}/filters`
- `GET/POST/PATCH /v1/groups/{groupId}/trails`
- `POST/PATCH /v1/groups/{groupId}/proximity-alerts`
- `POST /v1/groups/{groupId}/imports`
- `POST /v1/groups/{groupId}/exports`
- `POST /v1/sync/push`
- `GET /v1/sync/pull`
