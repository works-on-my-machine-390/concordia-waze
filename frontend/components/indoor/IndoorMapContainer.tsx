import FloorPlanViewer from "@/components/indoor/FloorPlanViewer";
import FloorSelector from "@/components/indoor/FloorSelector";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = {
  buildingCode: string;
};

export default function IndoorMapContainer({ buildingCode }: Readonly<Props>) {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const { data, isLoading, error } = useGetBuildingFloors(buildingCode);
  const { data: buildingData } = useGetBuildingDetails(buildingCode);

  useEffect(() => {
    if (data?.floors && data.floors.length > 0) {
      setSelectedFloor(data.floors[0].number);
    }
  }, [buildingCode, data?.floors]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading floor plans...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load floor plans</Text>
        <Text style={styles.errorDetail}>
          {error?.message || "Failed to load floor plans"}
        </Text>
      </View>
    );
  }

  if (!data || data.floors.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No floor plans available</Text>
      </View>
    );
  }

  if (selectedFloor === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const currentFloor =
    data.floors.find((f) => f.number === selectedFloor) || data.floors[0];

  return (
    <View style={styles.container}>
      <FloorSelector
        floors={data.floors}
        selectedFloor={selectedFloor}
        onSelectFloor={setSelectedFloor}
      />
      <FloorPlanViewer
        key={selectedFloor}
        floor={currentFloor}
        buildingCode={buildingCode}
        buildingName={buildingData?.long_name || ""}
        metroAccessible={buildingData?.metro_accessible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#912338",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: "#666",
  },
});
