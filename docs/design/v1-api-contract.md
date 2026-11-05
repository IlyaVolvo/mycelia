# Mycelia v1 API Contract

This contract covers endpoints and payloads for taxonomy tags, filters, and system facets.

## 1) Conventions
- Base path: `/v1`
- Auth: bearer JWT (Clerk). Role checks enforced server-side.
- Content type: `application/json`
- Pagination: cursor-based where list size may grow.
- Timestamps: ISO-8601 UTC.

## 2) Error Envelope

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human readable message",
  "details": {},
  "retriable": false
}
```

Common codes:
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## 3) Taxonomy Endpoints

### 3.1 List taxonomy (default simple view)
`GET /groups/{groupId}/taxonomy?view=default&maxDepth=2`

Behavior:
- Returns active nodes optimized for 1-2 level UX.
- Deep nodes may be hidden unless explicitly requested.

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "species",
      "category": "species",
      "parentId": null,
      "depth": 0,
      "iconKey": "species-default",
      "color": null,
      "hasChildren": true
    }
  ],
  "cursor": null
}
```

### 3.2 Create taxonomy node (default)
`POST /groups/{groupId}/taxonomy/nodes`

Request:

```json
{
  "name": "chanterelle",
  "category": "species",
  "parentId": "uuid-or-null",
  "iconKey": "mushroom-chanterelle",
  "color": "#D9A23A"
}
```

Rules:
- `category` required.
- For default flow, parent should be root category or null based on UX step.
- If `iconKey` omitted, API applies category default icon.

Permissions:
- `owner` and `editor`: allowed.
- `viewer`: forbidden.

### 3.3 Create deeper-level node (advanced)
`POST /groups/{groupId}/taxonomy/nodes/advanced`

Request:

```json
{
  "name": "north-slope",
  "category": "terrain",
  "parentId": "uuid-deep-parent",
  "iconKey": "terrain-slope"
}
```

Permissions:
- `owner` and `editor` only.

### 3.4 Update taxonomy node
`PATCH /groups/{groupId}/taxonomy/nodes/{nodeId}`

Request fields (partial):
- `name`
- `iconKey`
- `color`

Notes:
- Reparent/move operations should be handled through explicit endpoint later if needed.

### 3.5 Soft delete taxonomy node
`DELETE /groups/{groupId}/taxonomy/nodes/{nodeId}`

Behavior:
- Soft delete node and exclude from active selections.

## 4) Place Tag Assignment Endpoints

### 4.1 Assign taxonomy node to place
`POST /groups/{groupId}/places/{placeId}/taxonomy/{nodeId}`

Response: `204 No Content`

### 4.2 Remove taxonomy node from place
`DELETE /groups/{groupId}/places/{placeId}/taxonomy/{nodeId}`

Response: `204 No Content`

### 4.3 List place taxonomy tags
`GET /groups/{groupId}/places/{placeId}/taxonomy`

Response:

```json
{
  "items": [
    {
      "nodeId": "uuid",
      "name": "chanterelle",
      "category": "species",
      "path": ["species", "chanterelle"]
    }
  ]
}
```

## 5) Filters Endpoints

### 5.1 Preview filtered places
`POST /groups/{groupId}/filters/preview`

Request:

```json
{
  "includeNodeIds": ["uuid-parent", "uuid-child"],
  "excludeNodeIds": [],
  "dateFrom": null,
  "dateTo": null
}
```

Server semantics:
- Parent expansion always on.
- No toggle.
- Parent+descendant overlap auto-deduplicated silently to parent semantics.

Response:

```json
{
  "normalized": {
    "includeNodeIds": ["uuid-parent"],
    "excludeNodeIds": []
  },
  "count": 42,
  "samplePlaceIds": ["uuid1", "uuid2"]
}
```

### 5.2 Save filter preset
`POST /groups/{groupId}/filters`

Request:

```json
{
  "name": "Autumn species near pine",
  "criteria": {
    "includeNodeIds": ["uuid"],
    "excludeNodeIds": [],
    "dateFrom": "2026-09-01",
    "dateTo": "2026-11-30"
  }
}
```

### 5.3 List saved filters
`GET /groups/{groupId}/filters`

### 5.4 Update saved filter
`PATCH /groups/{groupId}/filters/{filterId}`

### 5.5 Delete saved filter
`DELETE /groups/{groupId}/filters/{filterId}`

## 6) Place Search Endpoint with Active Filters

`GET /groups/{groupId}/places/search?...`

Query params:
- `bbox`
- `includeNodeIds`
- `excludeNodeIds`
- `dateFrom`
- `dateTo`
- `cursor`
- `limit`

Behavior:
- Applies the same normalization semantics as `filters/preview`.

## 7) System Facets Endpoints

### 7.1 List facet definitions
`GET /system/facets/definitions`

Response:

```json
{
  "items": [
    {
      "key": "temperature_c",
      "valueType": "number",
      "unit": "celsius",
      "isUserEditable": false
    }
  ]
}
```

### 7.2 Get place facets
`GET /groups/{groupId}/places/{placeId}/facets`

Response:

```json
{
  "items": [
    {
      "key": "observed_date",
      "value": "2026-11-04",
      "capturedAt": "2026-11-04T10:11:12Z",
      "source": "device"
    }
  ],
  "missing": ["temperature_c", "weather_condition"]
}
```

Notes:
- Facets are read-only in v1.
- Missing environmental values are normal and should not be treated as errors.

### 7.3 Upsert place facets (system/internal)
`POST /groups/{groupId}/places/{placeId}/facets/system-capture`

Request:

```json
{
  "items": [
    { "key": "gps_accuracy_m", "value": 8.4, "source": "device" },
    { "key": "altitude_m", "value": 234.1, "source": "device" }
  ]
}
```

Permissions:
- Called by trusted app path with user auth context; not exposed as manual facet editor.

## 8) Role and Authorization Rules
- Viewer:
  - read taxonomy
  - assign/use existing tags if place edit allowed
  - no taxonomy mutation
- Editor/Owner:
  - full taxonomy mutation
  - advanced depth controls

## 9) Validation Rules
- Tag names normalized for uniqueness among siblings.
- Category required for tag creation.
- Icon key must belong to curated set.
- Parent references must stay within same group.

## 10) Idempotency and Sync Notes
- Mutating routes should accept `Idempotency-Key` header when called by sync engine.
- Responses should include updated `version` where relevant.
- Conflict policy remains simple LWW for deferred conflict workstream.
