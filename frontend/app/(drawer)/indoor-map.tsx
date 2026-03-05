import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";
import IndoorItineraryBottomSheet, {
  ITINERARY_SHEET_HEIGHT,
} from "@/components/indoor/IndoorItineraryBottomSheet";

import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIndoorItineraryController } from "@/hooks/useIndoorItineraryController";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useEffect } from "react";

// ✅ matches your browse bottom sheets ("15%") well; tune if needed
const BROWSE_SHEET_HEIGHT = 160    ;

export default function IndoorMapPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ buildingCode?: string }>();
  const buildingCode = params.buildingCode ?? "";

  const ctrl = useIndoorItineraryController(buildingCode);
  const nav = useIndoorNavigationStore();

  const hardReset = () => {
    if (typeof (nav as any).reset === "function") {
      (nav as any).reset();
      return;
    }

    nav.exitItinerary();
    nav.setSelectedRoom(null);
    nav.setPickMode("start");
    nav.setStart(null);
    nav.setEnd(null);
    nav.clearRoute();
    nav.setCurrentFloor?.(null);
  };

  useEffect(() => {
    hardReset();
    return () => hardReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingCode]);

  const handleBackToOutdoor = () => {
    hardReset();
    router.replace("/map");
  };

  const selectorOffset =
    nav.mode === "ITINERARY"
      ? ITINERARY_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24
      : BROWSE_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24;

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={buildingCode}
        routeSegments={ctrl.routeSegments}
        preferredFloorNumber={
          nav.mode === "ITINERARY"
            ? nav.start?.floor ?? nav.currentFloor ?? null
            : nav.currentFloor ?? null
        }
        // ✅ moves up for BOTH:
        // - itinerary bottom sheet
        // - browse (floor/room) bottom sheets
        floorSelectorBottomOffset={selectorOffset}
      />

      {nav.mode === "ITINERARY" ? (
        <IndoorItineraryHeader />
      ) : (
        <IndoorMapHeader
          searchText={""}
          onSearchPress={() => {}}
          onSearchClear={() => {}}
          onBackToOutdoor={handleBackToOutdoor}
        />
      )}

      <IndoorItineraryBottomSheet buildingCode={buildingCode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
});