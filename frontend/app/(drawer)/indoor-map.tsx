import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import IndoorItineraryBottomSheet, {
  ITINERARY_SHEET_HEIGHT,
} from "@/components/indoor/IndoorItineraryBottomSheet";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";

import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import { useIndoorItineraryController } from "@/hooks/useIndoorItineraryController";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BROWSE_SHEET_HEIGHT = 160;

export default function IndoorMapPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nav = useIndoorNavigationStore();

  const params = useLocalSearchParams<{
    buildingCode?: string;
    selectedRoom?: string;
    selectedFloor?: string;
  }>();

  const buildingCode = params.buildingCode ?? "";
  const ctrl = useIndoorItineraryController(buildingCode);
  const { data: buildingData } = useGetBuildingDetails(buildingCode);

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

  const handleSearchPress = () => {
    router.push({
      pathname: "/indoor-search",
      params: {
        buildingCode,
        buildingName: buildingData?.long_name || buildingCode,
      },
    });
  };

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
          params.selectedFloor
            ? Number.parseInt(params.selectedFloor, 10)
            : nav.mode === "ITINERARY"
              ? nav.start?.floor ?? nav.currentFloor ?? null
              : nav.currentFloor ?? null
        }
        floorSelectorBottomOffset={selectorOffset}
        selectedRoomFromSearch={params.selectedRoom}
        selectedFloorFromSearch={
          params.selectedFloor
            ? Number.parseInt(params.selectedFloor, 10)
            : undefined
        }
      />

      {nav.mode === "ITINERARY" ? (
        <IndoorItineraryHeader />
      ) : (
        <IndoorMapHeader
          onSearchPress={handleSearchPress}
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