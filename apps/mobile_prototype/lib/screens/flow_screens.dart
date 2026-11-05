import "package:flutter/material.dart";

import "../components/demo_scaffold.dart";
import "../state/demo_state.dart";

Widget signInScreen(DemoState state) => DemoScaffold(
      title: "Sign In",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Spacer(),
          Text("Mycelia", style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text("Find and organize mushroom places with your group."),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => state.authExpired = false,
            child: const Text("Continue with Clerk"),
          ),
          const Spacer(),
          const Text("By continuing, you agree to Terms and Privacy."),
        ],
      ),
    );

Widget groupSelectScreen() => DemoScaffold(
      title: "Choose Group",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Column(
              children: const [
                ListTile(title: Text("Forest Crew"), trailing: Icon(Icons.chevron_right)),
                Divider(height: 1),
                ListTile(title: Text("Weekend Foragers"), trailing: Icon(Icons.chevron_right)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const TextField(decoration: InputDecoration(labelText: "Create new group", hintText: "Group name")),
          const SizedBox(height: 12),
          FilledButton(onPressed: null, child: const Text("Create Group")),
        ],
      ),
    );

Widget mapHomeScreen(BuildContext context, DemoState state) => Scaffold(
      appBar: AppBar(
        title: const Text("Mycelia"),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.pushNamed(context, "/session-expired"),
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, "/add-place"),
        icon: const Icon(Icons.add),
        label: const Text("Add"),
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (state.isOffline)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Offline mode", style: TextStyle(fontWeight: FontWeight.w600)),
                          Text("Changes will sync later"),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pushNamed(context, "/queued"),
                      child: const Text("Queued"),
                    )
                  ],
                ),
              ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  ActionChip(label: const Text("Filters"), onPressed: () => Navigator.pushNamed(context, "/filters")),
                  const SizedBox(width: 8),
                  ActionChip(label: const Text("Species"), onPressed: () {}),
                  const SizedBox(width: 8),
                  ActionChip(label: const Text("Fall"), onPressed: () {}),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: GestureDetector(
                  onLongPress: () => Navigator.pushNamed(context, "/quick-create"),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.teal.shade50, Colors.green.shade100],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Center(
                      child: Text("Map canvas\n(long-press to drop pin)", textAlign: TextAlign.center),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );

Widget addPlaceScreen(BuildContext context) => DemoScaffold(
      title: "Add Place",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton.icon(
            onPressed: () => Navigator.pushNamed(context, "/quick-create"),
            icon: const Icon(Icons.my_location),
            label: const Text("Use Current Location"),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.place_outlined),
            label: const Text("Drop Pin on Map"),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => Navigator.pushNamed(context, "/quick-create"),
            icon: const Icon(Icons.photo_outlined),
            label: const Text("Import from Photo EXIF"),
          ),
          const SizedBox(height: 20),
          TextButton(
            onPressed: () => Navigator.pushNamed(context, "/location-denied"),
            child: const Text("Simulate permission denied"),
          )
        ],
      ),
    );

Widget quickCreateScreen() => DemoScaffold(
      title: "New Place",
      child: ListView(
        children: [
          const TextField(decoration: InputDecoration(labelText: "Name *")),
          const SizedBox(height: 12),
          const TextField(maxLines: 3, decoration: InputDecoration(labelText: "Description")),
          const SizedBox(height: 12),
          const TextField(decoration: InputDecoration(labelText: "Date observed", hintText: "YYYY-MM-DD")),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              title: const Text("Coordinates"),
              subtitle: const Text("45.123, -122.456\nAccuracy 9m"),
              trailing: Icon(Icons.gps_fixed, color: Colors.green.shade700),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: null, child: const Text("Save Place")),
        ],
      ),
    );

Widget placeDetailScreen(BuildContext context) => DemoScaffold(
      title: "Chanterelle Ridge",
      child: ListView(
        children: [
          const Text("45.123, -122.456"),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text("Tags", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              const Spacer(),
              TextButton(onPressed: () => Navigator.pushNamed(context, "/tags"), child: const Text("Add Tags")),
            ],
          ),
          Wrap(
            spacing: 8,
            children: const [
              Chip(label: Text("species: chanterelle")),
              Chip(label: Text("terrain: mossy")),
            ],
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Environmental context", style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  const Text("observed_date: 2026-11-02"),
                  const Text("temperature_c: --"),
                  const Text("weather_condition: --"),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text("Some environmental facets are unavailable for this place."),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );

Widget tagsManagerScreen(BuildContext context, DemoState state) {
  if (!state.hasAnyTags) {
    return emptyTaxonomyScreen(context, state);
  }

  return DemoScaffold(
    title: "Tags",
    child: ListView(
      children: [
        const TextField(decoration: InputDecoration(prefixIcon: Icon(Icons.search), hintText: "Search tags")),
        const SizedBox(height: 16),
        const Text("Species", style: TextStyle(fontWeight: FontWeight.w600)),
        const ListTile(title: Text("chanterelle")),
        const ListTile(title: Text("morel")),
        const Text("Terrain", style: TextStyle(fontWeight: FontWeight.w600)),
        const ListTile(title: Text("mossy")),
        const SizedBox(height: 16),
        FilledButton(onPressed: () => Navigator.pushNamed(context, "/create-tag"), child: const Text("Create Tag")),
        const SizedBox(height: 8),
        OutlinedButton(onPressed: state.clearTags, child: const Text("Reset to empty taxonomy")),
      ],
    ),
  );
}

Widget createTagScreen() => DemoScaffold(
      title: "Create Tag",
      child: ListView(
        children: [
          const TextField(decoration: InputDecoration(labelText: "Name *")),
          const SizedBox(height: 12),
          const Text("Category *", style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              ChoiceChip(label: Text("species"), selected: true),
              ChoiceChip(label: Text("terrain"), selected: false),
              ChoiceChip(label: Text("condition"), selected: false),
              ChoiceChip(label: Text("season"), selected: false),
            ],
          ),
          const SizedBox(height: 12),
          const TextField(decoration: InputDecoration(labelText: "Icon (optional)")),
          const SizedBox(height: 12),
          const TextField(decoration: InputDecoration(labelText: "Color (optional)")),
          const SizedBox(height: 16),
          FilledButton(onPressed: null, child: const Text("Save Tag")),
        ],
      ),
    );

Widget filtersScreen() => DemoScaffold(
      title: "Filters",
      child: ListView(
        children: [
          const Text("Include tags", style: TextStyle(fontWeight: FontWeight.w600)),
          Wrap(
            spacing: 8,
            children: const [
              FilterChip(selected: true, label: Text("species"), onSelected: null),
              FilterChip(selected: true, label: Text("terrain"), onSelected: null),
              FilterChip(selected: false, label: Text("season"), onSelected: null),
            ],
          ),
          const SizedBox(height: 12),
          const Text("Exclude tags", style: TextStyle(fontWeight: FontWeight.w600)),
          Wrap(
            spacing: 8,
            children: const [
              FilterChip(selected: false, label: Text("condition"), onSelected: null),
            ],
          ),
          const SizedBox(height: 12),
          const TextField(decoration: InputDecoration(labelText: "From")),
          const SizedBox(height: 8),
          const TextField(decoration: InputDecoration(labelText: "To")),
          const SizedBox(height: 12),
          Card(
            color: Colors.blue.shade50,
            child: const Padding(
              padding: EdgeInsets.all(12),
              child: Text("Parent tags automatically include all descendants."),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: FilledButton(onPressed: null, child: const Text("Apply"))),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton(onPressed: null, child: const Text("Save Preset"))),
            ],
          )
        ],
      ),
    );

Widget queuedChangesScreen(DemoState state) => DemoScaffold(
      title: "Queued Changes",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Queued changes (${state.queuedChanges})", style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  const Text("• Create place: Cedar Grove"),
                  const Text("• Add tag: species/morel"),
                  const Text("• Save filter: Fall spots"),
                  const SizedBox(height: 8),
                  const Text("Last sync: 12 min ago"),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: state.isOffline ? null : state.retrySyncNow,
            child: const Text("Retry sync now"),
          ),
        ],
      ),
    );

Widget syncFailureScreen(DemoState state) => DemoScaffold(
      title: "Sync needs attention",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text("3 changes could not sync.", style: TextStyle(fontWeight: FontWeight.w600)),
                  SizedBox(height: 4),
                  Text("Nothing is lost."),
                  SizedBox(height: 8),
                  Text("Reason: Network timeout"),
                  Text("Last attempt: just now"),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: state.retrySyncNow, child: const Text("Retry now")),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: state.toggleQueueFailures, child: const Text("Try in background")),
        ],
      ),
    );

Widget sessionExpiredScreen(DemoState state) => DemoScaffold(
      title: "Session expired",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Spacer(),
          const Text("Your session ended."),
          const Text("Sign in to continue syncing."),
          const Text("Local changes are safe."),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: state.toggleAuthExpired,
            child: const Text("Sign in again"),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () {
              state.isOffline = true;
              state.notifyListeners();
            },
            child: const Text("Continue offline"),
          ),
          const Spacer(),
        ],
      ),
    );

Widget emptyTaxonomyScreen(BuildContext context, DemoState state) => DemoScaffold(
      title: "No tags yet",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("Start with starter tags, or create your own from scratch."),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: state.importStarterTags,
            child: const Text("Import all starter tags"),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => showDialog<void>(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text("Choose categories"),
                content: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CheckboxListTile(value: true, onChanged: null, title: Text("Species")),
                    CheckboxListTile(value: false, onChanged: null, title: Text("Terrain")),
                    CheckboxListTile(value: true, onChanged: null, title: Text("Condition")),
                    CheckboxListTile(value: false, onChanged: null, title: Text("Season")),
                  ],
                ),
                actions: [
                  TextButton(onPressed: Navigator.of(context).pop, child: const Text("Cancel")),
                  FilledButton(onPressed: state.importStarterTags, child: const Text("Import selected")),
                ],
              ),
            ),
            child: const Text("Import by category"),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => Navigator.pushNamed(context, "/create-tag"),
            child: const Text("Create first tag"),
          ),
          const SizedBox(height: 8),
          TextButton(onPressed: () {}, child: const Text("Skip for now")),
        ],
      ),
    );

Widget locationDeniedScreen() => DemoScaffold(
      title: "Location permission is off",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("You can still add a place by dropping a pin on the map."),
          const SizedBox(height: 16),
          FilledButton(onPressed: null, child: const Text("Drop pin on map")),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: null, child: const Text("Open settings")),
        ],
      ),
    );
