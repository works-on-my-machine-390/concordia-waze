import { useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import FloorSelector from "@/components/indoor/FloorSelector";
import FloorPlanViewer from "@/components/indoor/FloorPlanViewer";

type Props = {
  buildingCode: string;
};

export default function IndoorMapContainer({ buildingCode }: Props) {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const { data, isLoading, error } = useGetBuildingFloors(buildingCode);

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
        <Text style={styles.errorDetail}>{(error as Error).message}</Text>
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

  const currentFloor =
    data.floors.find((f) => f.number === selectedFloor) || data.floors[0];

  return (
    <View style={styles.container}>
      <FloorPlanViewer floor={currentFloor} />

      <FloorSelector
        floors={data.floors}
        selectedFloor={selectedFloor}
        onSelectFloor={setSelectedFloor}
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
