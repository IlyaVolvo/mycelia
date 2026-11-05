# Mycelia v1 Flutter UX Contract

This contract defines the exact v1 mobile UX behavior for tags, filters, and system facets.

## 1) UX Principles
- Map-first by default.
- Low clutter: hide advanced controls unless explicitly requested.
- Fast capture over perfect form completion.
- Predictable filtering: parent tag always includes descendants.

## 2) Primary Screens

### A. Map Home
Purpose:
- Main entry point for discovering and creating locations.

Core elements:
- Map canvas.
- Floating Add button.
- Compact Filter chip row (active filter summary only).
- Optional bottom sheet preview for selected location.

Rules:
- No system-facet availability indicator on map markers.
- Marker visuals prioritize user tags/icons.

### B. Location Detail
Purpose:
- Full place context and edit actions.

Sections:
- Header: name, coordinates, created/observed date.
- User tags: editable.
- System facets: read-only context block.
- Notes/media/trails summary.

Rules:
- If weather_condition or temperature_c is missing, show subtle availability indicator only here.
- No warning banners for missing facets.

### C. Tags Manager
Purpose:
- Create, browse, assign, and maintain taxonomy.

Default mode:
- Focus on level 1 and level 2 only.
- Required category on new tag.
- Icon optional; if omitted, category default icon is auto-applied.

Advanced mode (explicit action):
- Visible only to owner/editor roles.
- Allows adding deeper hierarchy levels.
- Hidden from viewers.

### D. Filters Panel
Purpose:
- Build and save reusable map filters.

Default behavior:
- Parent selection auto-expands to descendants.
- Expansion is always on and has no toggle.
- If both parent and descendant are selected, system deduplicates silently (parent semantics retained).

### E. Starter Tags Onboarding
Purpose:
- Optional bootstrap of public starter taxonomy.

Choices:
- Import all.
- Import by category.
- Skip.

Rules:
- Skipping keeps group taxonomy empty until user creates/imports tags.

## 3) Interaction Flows

### Flow 1: Quick tag creation (default)
1. User opens Tags.
2. Enters name.
3. Selects required category (species, terrain, condition, season).
4. Optionally chooses icon/color.
5. If icon omitted, auto-assign category default icon.
6. Save.

Expected outcome:
- New tag appears immediately and is available in filters/place assignment.

### Flow 2: Deeper hierarchy creation (advanced)
1. Owner/editor opens advanced controls.
2. Selects parent path.
3. Adds deeper child node.
4. Confirms full path preview.

Expected outcome:
- New deep node is valid for assignment/filtering.
- Default views remain 1-2 level focused.

### Flow 3: Parent-based filtering
1. User opens Filter panel.
2. Selects a parent tag.
3. System includes all descendants automatically.
4. User saves filter preset.

Expected outcome:
- Broad filter without extra knobs.

### Flow 4: Parent + child overlap
1. User selects parent and one of its descendants.
2. System silently deduplicates.

Expected outcome:
- Query semantics remain parent-based.
- UI avoids redundant clutter.

## 4) Visual/Component Contract

### Tag chip
- Displays icon + name.
- Category color accent optional.
- Selected state clearly distinguishable.

### Parent tag chip
- May show compact branch indicator (for example, chevron or tree dot).
- Does not expose expansion toggle in filter panel.

### Availability indicator (system facets)
- Location detail only.
- Neutral style, non-blocking tone.
- Example text: "Some environmental facets unavailable".

## 5) Role-Based Visibility
- Viewer:
  - Can assign existing tags to locations (if allowed by place edit permissions).
  - Can filter using all existing tags, including deep tags.
  - Cannot access advanced taxonomy creation tools.
- Owner/editor:
  - Full access to advanced taxonomy controls.

## 6) Empty and Error States

### Empty taxonomy
- Message: "No tags yet".
- Actions: Create tag, Import starter tags.

### Duplicate tag
- Inline error with suggestion.

### Missing required category
- Blocking inline validation on save.

### Missing facet values
- No blocking behavior.
- Subtle indicator only in Location Detail.

## 7) Performance and UX Budgets
- Filter application should feel immediate for typical datasets.
- Map should not re-layout full UI on each chip selection.
- Tag picker should open under 150 ms on average device.

## 8) Non-Goals for v1 UX
- Full tree editor exposed to all users.
- Toggleable parent-expansion semantics.
- Custom uploaded tag icons.
- Facet editing UI.

## 9) Acceptance Criteria
1. Default user can manage tags/filters without seeing deep-tree complexity.
2. Parent filter expansion works consistently across sessions and saved filters.
3. Overlapping parent/descendant selections never produce duplicated semantics.
4. Missing weather/temperature never blocks flow and is only indicated in location detail.
5. Advanced hierarchy controls are visible only to owner/editor.
