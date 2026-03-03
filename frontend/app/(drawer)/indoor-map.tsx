import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";
import IndoorItineraryBottomSheet, {
  ITINERARY_SHEET_HEIGHT,
} from "@/components/indoor/IndoorItineraryBottomSheet";

import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { GetDirectionsIcon } from "@/app/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIndoorItineraryController } from "@/hooks/useIndoorItineraryController";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useEffect } from "react";

export default function IndoorMapPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ buildingCode?: string }>();
  const buildingCode = params.buildingCode ?? "";

  const ctrl = useIndoorItineraryController(buildingCode);
  const nav = useIndoorNavigationStore();

  const hardReset = () => {
    // if you added a reset() in store, use it
    if (typeof (nav as any).reset === "function") {
      (nav as any).reset();
      return;
    }

    // otherwise, reset with existing actions
    nav.exitItinerary(); // sets mode=BROWSE and clears start/end/route
    nav.setSelectedRoom(null);
    nav.setPickMode("start");
    nav.setStart(null);
    nav.setEnd(null);
    nav.clearRoute();
    nav.setCurrentFloor?.(null);
  };

  // Reset when entering this screen for a new building, and also on unmount.
  useEffect(() => {
    hardReset();
    return () => {
      hardReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingCode]);

  const handleBackToOutdoor = () => {
    hardReset();
    router.replace("/map");
  };

  const showItineraryButton = nav.mode === "BROWSE" && nav.selectedRoom != null;

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
        floorSelectorBottomOffset={
          nav.mode === "ITINERARY"
            ? ITINERARY_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24
            : 24
        }
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

      {showItineraryButton ? (
        <TouchableOpacity
          style={[
            styles.floatingIcon,
            {
              right: 16,
              bottom: Math.max(insets.bottom, 12) + 110,
            },
          ]}
          onPress={nav.enterItineraryFromSelected}
          activeOpacity={0.85}
        >
          <GetDirectionsIcon size={90} color={"#912338"} />
        </TouchableOpacity>
      ) : null}

      <IndoorItineraryBottomSheet buildingCode={buildingCode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  floatingIcon: {
    position: "absolute",
    zIndex: 300,
    elevation: 300,
    borderRadius: 20,
    padding: 6,
  },
});