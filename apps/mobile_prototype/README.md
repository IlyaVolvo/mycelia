# Mycelia Clickable Flutter Prototype

This is a clickable prototype of the v1 flow and edge-case interactions.

## Included

- Primary screens: sign-in, group select, map home, add place, quick create, place detail, tags manager, create tag, filters.
- Edge-case screens: offline queue, sync failure recovery, session expiry, empty taxonomy onboarding, location permission denied fallback.
- Global toggles on the home screen to simulate app conditions.

## Run

1. Install Flutter SDK (stable channel).
2. From this directory, run:

```bash
flutter pub get
flutter run
```

## Notes

- This prototype uses in-memory state only and does not call backend APIs.
- Route map is defined in lib/main.dart.
- Screen implementations are in lib/screens/flow_screens.dart.
