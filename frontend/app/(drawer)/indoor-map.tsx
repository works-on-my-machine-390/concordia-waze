import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import IndoorItineraryBottomSheet, {
  ITINERARY_SHEET_HEIGHT,
} from "@/components/indoor/IndoorItineraryBottomSheet";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";

import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import { useIndoorItineraryController } from "@/hooks/useIndoorItineraryController";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useMapSettings, { MapSettings } from "@/hooks/useMapSettings";

const BROWSE_SHEET_HEIGHT = 160;

export default function IndoorMapPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // const nav = useIndoorNavigationStore();

  const params = useLocalSearchParams<{
    buildingCode?: string;
    selectedRoom?: string;
    selectedFloor?: string;
  }>();

  const buildingCode = params.buildingCode ?? "";
  const ctrl = useIndoorItineraryController(buildingCode);

  const { data: buildingData } = useGetBuildingDetails(buildingCode);
  const { mapSettings, updateSetting } = useMapSettings();

  const isAccessibilityMode = mapSettings.preferAccessibleRoutes;
  const handleToggleAccessibilityMode = () => {
    updateSetting(
      MapSettings.preferAccessibleRoutes,
      !mapSettings.preferAccessibleRoutes,
    );
  };

  // const hardReset = () => {
  //   if (typeof (nav as any).reset === "function") {
  //     (nav as any).reset();
  //     return;
  //   }

  //   nav.exitItinerary();
  //   nav.setSelectedRoom(null);
  //   nav.setPickMode("start");
  //   nav.setStart(null);
  //   nav.setEnd(null);
  //   nav.clearRoute();
  //   nav.setCurrentFloor?.(null);
  // };

  // useEffect(() => {
  //   hardReset();
  //   return () => hardReset();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [buildingCode]);

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
    // hardReset();
    router.replace("/map");
  };

  // const selectorOffset =
  //   nav.mode === "ITINERARY"
  //     ? ITINERARY_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24
  //     : BROWSE_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24;

  const parsedSearchFloor = params.selectedFloor
    ? Number.parseInt(params.selectedFloor, 10)
    : undefined;

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={buildingCode}
        routeSegments={ctrl.routeSegments}
        // preferredFloorNumber={nav.currentFloor ?? null}
        // selectedRoomFromSearch={
        //   nav.mode === "BROWSE" ? params.selectedRoom : undefined
        // }
        // selectedFloorFromSearch={
        //   nav.mode === "BROWSE" ? parsedSearchFloor : undefined
        // }
        requireAccessible={isAccessibilityMode}
      />

      {/* {nav.mode === "ITINERARY" ? (
        <>
          <IndoorItineraryHeader
            buildingCode={buildingCode}
            buildingName={buildingData?.long_name || buildingCode}
          />
          <IndoorItineraryBottomSheet buildingCode={buildingCode} />
        </>
      ) : ( */}
        <IndoorMapHeader
          onSearchPress={handleSearchPress}
          onBackToOutdoor={handleBackToOutdoor}
          isAccessibilityMode={isAccessibilityMode}
          onAccessibilityToggle={handleToggleAccessibilityMode}
        />
      {/* )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
});
