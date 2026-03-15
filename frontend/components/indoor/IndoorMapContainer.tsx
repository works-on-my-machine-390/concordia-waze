import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";
import FloorPlanViewer from "@/components/indoor/FloorPlanViewer";
import FloorSelector from "@/components/indoor/FloorSelector";
import NoAccessibleRouteNotice from "@/components/indoor/NoAccessibleRouteNotice";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import type {
  Coordinates,
  FloorSegment,
} from "@/hooks/queries/indoorDirectionsQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export type SelectedPoint = {
  label: string;
  floor: number;
  coord: Coordinates;
};

type Props = {
  buildingCode: string;
  routeSegments?: FloorSegment[] | null;
  preferredFloorNumber?: number | null;
  floorSelectorBottomOffset?: number;
  requireAccessible?: boolean;
};

export default function IndoorMapContainer({
  buildingCode,
  floorSelectorBottomOffset = 24,
  requireAccessible = false,
}: Readonly<Props>) {
  const params = useLocalSearchParams<IndoorMapPageParams>();

  const [accessibilityRouteUnavailable, setAccessibilityRouteUnavailable] =
    useState(false);

  const { data, isLoading, error } = useGetBuildingFloors(buildingCode);
  const { data: buildingData } = useGetBuildingDetails(buildingCode);

  useEffect(() => {
    setAccessibilityRouteUnavailable(false);
  }, [requireAccessible]);

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
          {(error as any)?.message || "Failed to load floor plans"}
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

  if (!params.selectedFloor) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FloorPlanViewer
        key={params.selectedFloor}
        floor={data?.floors.find(
          (f) => f.number == Number.parseInt(params.selectedFloor),
        )}
        buildingName={buildingData?.long_name || ""}
        metroAccessible={buildingData?.metro_accessible}
        requireAccessible={requireAccessible}
        onAccessibilityRouteUnavailable={() =>
          setAccessibilityRouteUnavailable(true)
        }
      />

      <FloorSelector
        floors={data.floors}
        selectedFloor={Number.parseInt(params.selectedFloor)}
        onSelectFloor={(floorNumber: number) =>
          router.setParams({
            selectedFloor: floorNumber.toString(),
            selectedPoiName: null, // reset selected POI when changing floors
          })
        }
        bottomOffset={floorSelectorBottomOffset}
      />

      <NoAccessibleRouteNotice visible={accessibilityRouteUnavailable} />
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
