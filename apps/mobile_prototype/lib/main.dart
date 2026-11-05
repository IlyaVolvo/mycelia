import "package:flutter/material.dart";
import "package:google_fonts/google_fonts.dart";

import "components/demo_scaffold.dart";
import "screens/flow_screens.dart";
import "screens/home_screen.dart";
import "state/demo_state.dart";

void main() {
  runApp(const MyceliaPrototypeApp());
}

class MyceliaPrototypeApp extends StatefulWidget {
  const MyceliaPrototypeApp({super.key});

  @override
  State<MyceliaPrototypeApp> createState() => _MyceliaPrototypeAppState();
}

class _MyceliaPrototypeAppState extends State<MyceliaPrototypeApp> {
  final DemoState _state = DemoState();

  @override
  void initState() {
    super.initState();
    _state.addListener(_stateListener);
  }

  @override
  void dispose() {
    _state.removeListener(_stateListener);
    _state.dispose();
    super.dispose();
  }

  void _stateListener() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final base = ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF0D5C63),
        primary: const Color(0xFF0D5C63),
        secondary: const Color(0xFFF4A259),
      ),
      useMaterial3: true,
    );

    return MaterialApp(
      title: "Mycelia Clickable Prototype",
      theme: base.copyWith(
        textTheme: GoogleFonts.spaceGroteskTextTheme(base.textTheme),
      ),
      initialRoute: "/",
      routes: {
        "/": (context) => DemoScaffold(
              title: "Prototype Navigator",
              child: HomeScreen(state: _state),
            ),
        "/sign-in": (context) => signInScreen(_state),
        "/group": (context) => groupSelectScreen(),
        "/map": (context) => mapHomeScreen(context, _state),
        "/add-place": (context) => addPlaceScreen(context),
        "/quick-create": (context) => quickCreateScreen(),
        "/place-detail": (context) => placeDetailScreen(context),
        "/tags": (context) => tagsManagerScreen(context, _state),
        "/create-tag": (context) => createTagScreen(),
        "/filters": (context) => filtersScreen(),
        "/queued": (context) => queuedChangesScreen(_state),
        "/sync-failure": (context) => syncFailureScreen(_state),
        "/session-expired": (context) => sessionExpiredScreen(_state),
        "/empty-taxonomy": (context) => emptyTaxonomyScreen(context, _state),
        "/location-denied": (context) => locationDeniedScreen(),
      },
    );
  }
}
