# Mycelia v1 Medium-Fidelity UI Specification

This specification upgrades the low-fidelity mockups into implementation-ready interaction and layout rules for Flutter.

Companion docs:
- Flow and lo-fi wireframes: docs/design/v1-screen-flow-mockups.md
- UX behavior contract: docs/design/v1-flutter-ux-contract.md

## 1. Global Layout System

### 1.1 Device Targets
- Primary baseline: 390 x 844 pt (iPhone 13/14 class).
- Android baseline: 411 x 891 dp (Pixel class).
- Safe area required for top app bar and bottom action zones.

### 1.2 Spacing Scale
- 4: micro gap
- 8: tight gap
- 12: compact section gap
- 16: default container padding
- 24: major section separation
- 32: hero spacing

Rules:
- Screen side padding: 16.
- Vertical rhythm between form controls: 12.
- Vertical rhythm between sections: 24.
- Bottom CTA inset: 16 side, 16 bottom (above safe area).

### 1.3 Typography Roles
- Display title: 28 / semibold
- Screen title: 22 / semibold
- Section title: 17 / semibold
- Body: 15 / regular
- Supporting text: 13 / regular
- Label/caption: 12 / medium

### 1.4 Touch Targets
- Minimum tap size: 44 x 44.
- Icon-only buttons must include 12 internal padding.
- Chips min height: 32.

### 1.5 Color Roles (Semantic)
- Surface: base background.
- SurfaceRaised: cards, sheets.
- Primary: main CTA and active controls.
- AccentSpecies, AccentTerrain, AccentCondition, AccentSeason: taxonomy accents.
- WarningSoft: non-blocking availability note.
- Error: validation and API failure text.

## 2. Component Specifications

### 2.1 Primary Button
- Height: 52.
- Corner radius: 14.
- Horizontal padding: 20.
- States:
  - Default: filled primary.
  - Pressed: 92% brightness.
  - Disabled: 50% opacity.
  - Loading: spinner + label preserved.

Primary labels:
- Save Place
- Save Tag
- Apply
- Save Preset

### 2.2 Secondary Button
- Height: 48.
- Border: 1 px outline.
- Corner radius: 12.
- Used for Cancel, Retry, Skip, Import by Category.

### 2.3 Input Field
- Height: 52 (single-line), 112 (multi-line description).
- Label above field, helper/error text below field.
- Error text starts with action language:
  - Try a different name.
  - Choose a category to continue.

### 2.4 Chip
- Height: 32.
- Horizontal padding: 10.
- Gap between chips: 8.
- Variants:
  - Filter chip (selected/unselected/removable).
  - Tag chip (icon + label + optional category accent).
  - Read-only summary chip.

### 2.5 Bottom Sheet
- Top radius: 20.
- Sheet padding: 16.
- Drag handle: 36 x 4.
- Snap points:
  - Peek: 22% height.
  - Mid: 50% height.
  - Full: 92% height.

## 3. Screen-by-Screen Medium Fidelity

## 3.1 Screen A: Sign In

Layout:
- Top logo zone starts 64 from safe top.
- Value proposition block below logo with 24 gap.
- Primary Clerk button pinned to lower third.
- Terms/Privacy text anchored 24 above bottom safe area.

Copy:
- Title: Mycelia
- Subtitle: Find and organize mushroom places with your group.
- CTA: Continue with Clerk
- Footer: By continuing, you agree to Terms and Privacy.

States:
- Idle.
- Loading auth handoff.
- Error inline above CTA: Sign-in failed. Please try again.

Transition:
- On success, push Group Select with 220 ms ease-out.

## 3.2 Screen B: Group Select / Create

Layout:
- Screen title at top.
- Existing groups list card section.
- Divider + create group form section.
- Create button full-width.

List row spec:
- Height: 56.
- Left: group name, optional role badge.
- Right: chevron.

Copy:
- Title: Choose Group
- Existing section: Your groups
- Create section: Create new group
- Input placeholder: Group name
- CTA: Create Group

Validation:
- Empty group name: Enter a group name.
- API create failure: Could not create group. Try again.

## 3.3 Screen C: Map Home

Layout:
- Full-bleed map.
- Top floating bar:
  - App title left.
  - Profile/action icon right.
- Filter chip row under top bar, horizontal scroll.
- Floating Add button bottom-right.
- Optional preview sheet at bottom.

Map marker behavior:
- Marker tap opens preview sheet at peek snap.
- Cluster tap zooms one level and recenters.

Copy:
- Empty filters chip: Filters
- Offline banner (if needed): Offline mode. Changes will sync later.

Motion:
- Marker selection pulse: 180 ms.
- Filter apply map refresh: target under 200 ms perceived update.

## 3.4 Screen D: Add Place Action Sheet

Layout:
- Title + three stacked actions + cancel.
- Action row height: 52.
- Icons left, labels center-left.

Copy:
- Use Current Location
- Drop Pin on Map
- Import from Photo EXIF
- Cancel

Branching:
- Current location -> permission check.
- Drop pin -> dismiss sheet and enter map pin mode.
- EXIF -> open picker.

## 3.5 Screen E: Quick Create Form

Layout:
- Scrollable form.
- Name required at top.
- Description optional.
- Date input optional.
- Read-only coordinate and accuracy card.
- Save CTA pinned to bottom safe area.

Copy:
- Title: New Place
- Name label: Name
- Description label: Description
- Date label: Date observed
- Coordinate label: Coordinates
- Accuracy label: Accuracy

Validation:
- Missing name: Enter a place name.
- Date malformed: Use YYYY-MM-DD.

Success feedback:
- Toast: Place saved.
- Immediate marker render on map.

## 3.6 Screen F: Place Detail

Layout:
- Header with place title + coordinates.
- Tags section with Add Tags action.
- System facets section card (read-only).
- Secondary actions below fold (notes/media/trails).

System facets presentation:
- Key-value rows, missing values displayed as em dash.
- Non-blocking note at bottom of facet card if weather/temperature missing.

Copy:
- System facets title: Environmental context
- Missing note: Some environmental facets are unavailable for this place.

## 3.7 Screen G: Tags Manager (Default)

Layout:
- Search input top.
- Categorized list focused on level 1 and level 2.
- Sticky footer actions:
  - Create Tag
  - Import Starter Tags
  - Advanced Hierarchy (owner/editor only)

Role visibility:
- Viewer does not see Advanced Hierarchy action.

Empty state:
- Title: No tags yet
- Body: Create your first tag or import starter tags.
- Actions: Create Tag, Import Starter Tags

## 3.8 Screen H: Create Tag

Layout:
- Name input.
- Category segmented options (2x2 grid).
- Optional icon picker row.
- Optional color swatch row.
- Save CTA pinned.

Category option cell:
- Height: 44.
- Radius: 10.
- Selected state: filled semantic accent at low opacity + check icon.

Validation:
- Missing category: Choose a category to continue.
- Duplicate name: This tag name already exists. Try a different name.

Behavior:
- If icon omitted, assign category default icon at submit.

## 3.9 Screen I: Filters Panel

Layout:
- Include tags section.
- Exclude tags section.
- Date range section.
- Auto-expansion info card.
- Dual CTA row: Apply and Save Preset.

Info card copy:
- Parent tags automatically include all descendants.

Selection behavior:
- Parent + child selected -> deduplicate before API payload creation.
- No user-facing warning toast for dedupe.

## 3.10 Screen J: Save Filter Preset

Layout:
- Name field.
- Generated summary card.
- Save button.

Summary format:
- Include: {comma-separated labels}
- Exclude: {comma-separated labels or None}
- Date: {range or Any}

Validation:
- Missing preset name: Enter a preset name.

Success:
- Toast: Filter preset saved.
- Return to Map Home with new quick chip visible.

## 4. State Matrix (Interaction Clarity)

### 4.1 Network States
- Online:
  - Normal behavior.
- Offline:
  - Persistent top banner.
  - Mutations write local + queue.
  - No blocking modal for normal create/edit.
- Reconnecting:
  - Small syncing indicator in top map bar.

### 4.2 Permission States (Location)
- Unknown: request prompt when user chooses current location path.
- Denied: show fallback card with action Drop Pin on Map.
- Granted: continue to quick create.

### 4.3 Authorization States (Group role)
- Owner/editor:
  - Full taxonomy management including advanced hierarchy.
- Viewer:
  - Read and filter using tags.
  - No advanced hierarchy controls.

## 5. Motion and Transition Spec

- Standard page push: 220 ms, ease-out.
- Bottom sheet expand/collapse: 180 ms, ease-in-out.
- Chip select/deselect: 120 ms color transition.
- Save success feedback:
  - 80 ms button press compression.
  - Toast appears within 120 ms after API/local write success.

## 6. Copy Dictionary (Canonical Strings)

Use these strings as defaults for consistency:
- Filters
- Save Preset
- Add Tags
- Create Tag
- Import Starter Tags
- Advanced Hierarchy
- Some environmental facets are unavailable for this place.
- Offline mode. Changes will sync later.
- Sign-in failed. Please try again.
- Could not create group. Try again.
- Enter a place name.
- Enter a preset name.
- Choose a category to continue.
- This tag name already exists. Try a different name.

## 7. Flutter Mapping Guide (Implementation Shortcut)

Recommended widget mapping:
- Map Home: Scaffold + Stack + GoogleMap + Positioned chips + FloatingActionButton.extended.
- Bottom sheets: showModalBottomSheet with DraggableScrollableSheet.
- Forms: CustomScrollView + SliverToBoxAdapter + pinned bottom CTA.
- Tag/category chips: ChoiceChip and InputChip variants with custom theme.
- Toasts/snackbars: ScaffoldMessenger.

State containers:
- Map + filters: one reactive state store for current viewport, active filter, and selected place.
- Create flows: local form state + submit controller.
- Role-gated UI: membership role in session state.

## 8. Prototype Acceptance Checks

- First-time user can create a place from map home in under 20 seconds.
- Parent-filter behavior is understandable without additional tooltip reading.
- Viewer never sees advanced taxonomy controls.
- Missing system facets appears as context, not an error.
- Denied location permission path still completes place creation via drop pin.
