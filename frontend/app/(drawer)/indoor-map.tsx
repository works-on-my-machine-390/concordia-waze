import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";

import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import useMapSettings, { MapSettings } from "@/hooks/useMapSettings";
import { trackEvent } from "@/lib/telemetry";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BROWSE_SHEET_HEIGHT = 160;

// for these variables, the search params are the source of truth.
export type IndoorMapPageParams = {
  buildingCode: string;
  selectedFloor: string;

  // including both room and non-room POIs. POIs don't have IDs which is why we resort to names.
  // names aren't unique across floors which is why they must be processed in conjunction with the selected floor & building.
  selectedPoiName?: string;
};

export default function IndoorMapPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<IndoorMapPageParams>();

  const floorQuery = useGetBuildingFloors(params.buildingCode);

  useEffect(() => {
    if (!params.selectedFloor) {
      router.setParams({
        selectedFloor: floorQuery.data?.floors[0].number.toString(),
      });
    }
  }, [floorQuery.data, params.selectedFloor, router]);

  const { data: buildingData } = useGetBuildingDetails(params.buildingCode);
  const { mapSettings, updateSetting } = useMapSettings();

  const isAccessibilityMode = mapSettings.preferAccessibleRoutes;
  const handleToggleAccessibilityMode = () => {
    const newValue = !mapSettings.preferAccessibleRoutes;
    updateSetting(MapSettings.preferAccessibleRoutes, newValue);
    void trackEvent("accessibility_toggled", { enabled: newValue });
  };

  const handleSearchPress = () => {
    router.push({
      pathname: "/indoor-search",
      params: {
        buildingCode: params.buildingCode,
        buildingName: buildingData?.long_name || params.buildingCode,
        previouslySelectedFloor: params.selectedFloor,
      },
    });
  };

  const handleBackToOutdoor = () => {
    router.replace("/map");
  };

  const floorSelectorBottomOffset =
    BROWSE_SHEET_HEIGHT + Math.max(insets.bottom, 8) + 24;

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={params.buildingCode}
        floorSelectorBottomOffset={floorSelectorBottomOffset}
        requireAccessible={isAccessibilityMode}
      />

      <IndoorMapHeader
        onSearchPress={handleSearchPress}
        onBackToOutdoor={handleBackToOutdoor}
        isAccessibilityMode={isAccessibilityMode}
        onAccessibilityToggle={handleToggleAccessibilityMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
});
