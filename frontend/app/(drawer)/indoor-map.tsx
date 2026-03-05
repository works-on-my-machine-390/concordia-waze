import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import PoiFilterBottomSheet from "@/components/indoor/PoiFilterBottomSheet";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function IndoorMapPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    buildingCode?: string;
    selectedRoom?: string;
    selectedFloor?: string;
  }>();

  const buildingCode = params.buildingCode || "";

  const { data: buildingData } = useGetBuildingDetails(buildingCode);
  const { data: floorsData } = useGetBuildingFloors(buildingCode);
  const floors = floorsData?.floors || [];

  const { selectedPoiFilter, clearSelectedPoiFilter } = useIndoorSearchStore();

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
    router.push("/map");
  };

  const handlePoiSelectFromFilter = (roomCode: string, floorNumber: number) => {
    clearSelectedPoiFilter();

    router.push({
      pathname: "/indoor-map",
      params: {
        buildingCode,
        selectedRoom: roomCode,
        selectedFloor: floorNumber.toString(),
      },
    });
  };

  return (
    <View style={styles.mapContainer}>
      <IndoorMapContainer
        buildingCode={buildingCode}
        selectedRoomFromSearch={params.selectedRoom}
        selectedFloorFromSearch={
          params.selectedFloor
            ? Number.parseInt(params.selectedFloor)
            : undefined
        }
      />

      <IndoorMapHeader
        onSearchPress={handleSearchPress}
        onBackToOutdoor={handleBackToOutdoor}
      />

      {selectedPoiFilter && (
        <View style={styles.filterSheetContainer}>
          <PoiFilterBottomSheet
            poiType={selectedPoiFilter.type}
            poiLabel={selectedPoiFilter.label}
            floors={floors}
            buildingCode={buildingCode}
            onPoiSelect={handlePoiSelectFromFilter}
            onClose={clearSelectedPoiFilter}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  filterSheetContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 200,
  },
});
