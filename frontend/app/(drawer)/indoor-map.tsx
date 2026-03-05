import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
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
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: "relative",
  },
});
