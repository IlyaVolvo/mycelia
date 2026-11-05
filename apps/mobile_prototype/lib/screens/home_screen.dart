import "package:flutter/material.dart";

import "../state/demo_state.dart";

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.state,
  });

  final DemoState state;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Text(
          "Mycelia Prototype",
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 8),
        Text(
          "Tap through core screens and edge-case recovery flows.",
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilterChip(
              selected: state.isOffline,
              label: const Text("Offline mode"),
              onSelected: (_) => state.toggleOffline(),
            ),
            FilterChip(
              selected: state.authExpired,
              label: const Text("Auth expired"),
              onSelected: (_) => state.toggleAuthExpired(),
            ),
            FilterChip(
              selected: state.queueHasFailures,
              label: const Text("Sync failure"),
              onSelected: (_) => state.toggleQueueFailures(),
            ),
            FilterChip(
              selected: !state.hasAnyTags,
              label: const Text("Empty taxonomy"),
              onSelected: (_) {
                if (state.hasAnyTags) {
                  state.clearTags();
                }
              },
            ),
          ],
        ),
        const SizedBox(height: 24),
        _Section(
          title: "Primary Flow Screens",
          routes: const [
            ("Sign In", "/sign-in"),
            ("Group Select/Create", "/group"),
            ("Map Home", "/map"),
            ("Add Place", "/add-place"),
            ("Quick Create", "/quick-create"),
            ("Place Detail", "/place-detail"),
            ("Tags Manager", "/tags"),
            ("Create Tag", "/create-tag"),
            ("Filters", "/filters"),
          ],
        ),
        const SizedBox(height: 16),
        _Section(
          title: "Edge-Case Screens",
          routes: const [
            ("Queued Changes", "/queued"),
            ("Sync Failure", "/sync-failure"),
            ("Session Expired", "/session-expired"),
            ("Empty Taxonomy", "/empty-taxonomy"),
            ("Location Denied", "/location-denied"),
          ],
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.routes,
  });

  final String title;
  final List<(String, String)> routes;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...routes.map(
              (entry) => ListTile(
                title: Text(entry.$1),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pushNamed(context, entry.$2),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
