import "package:flutter/foundation.dart";

class DemoState extends ChangeNotifier {
  bool isOffline = true;
  bool authExpired = false;
  bool queueHasFailures = true;
  bool hasAnyTags = false;
  int queuedChanges = 7;

  void toggleOffline() {
    isOffline = !isOffline;
    notifyListeners();
  }

  void toggleAuthExpired() {
    authExpired = !authExpired;
    notifyListeners();
  }

  void toggleQueueFailures() {
    queueHasFailures = !queueHasFailures;
    notifyListeners();
  }

  void importStarterTags() {
    hasAnyTags = true;
    notifyListeners();
  }

  void clearTags() {
    hasAnyTags = false;
    notifyListeners();
  }

  void retrySyncNow() {
    queueHasFailures = false;
    isOffline = false;
    queuedChanges = 0;
    notifyListeners();
  }
}
