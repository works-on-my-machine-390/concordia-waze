import FloorPlanViewer from "@/components/indoor/FloorPlanViewer";
import FloorSelector from "@/components/indoor/FloorSelector";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import type { FloorSegment, Coordinates } from "@/hooks/queries/indoorDirectionsQueries";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";

export type SelectedPoint = {
  label: string; // room name
  floor: number;
  coord: Coordinates; // normalized [0..1]
};

type Props = {
  buildingCode: string;

  // route segments from backend
  routeSegments?: FloorSegment[] | null;
  preferredFloorNumber?: number | null;

  // allows parent to push floor selector up (ex: when itinerary sheet open)
  floorSelectorBottomOffset?: number;
};

export default function IndoorMapContainer({
  buildingCode,
  routeSegments = null,
  preferredFloorNumber = null,
  floorSelectorBottomOffset = 24,
}: Readonly<Props>) {
  const nav = useIndoorNavigationStore();

  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const { data, isLoading, error } = useGetBuildingFloors(buildingCode);

  useEffect(() => {
    if (!data?.floors?.length) return;

    if (preferredFloorNumber != null) {
      setSelectedFloor(preferredFloorNumber);
      return;
    }

    setSelectedFloor(data.floors[0].number);
  }, [buildingCode, data?.floors, preferredFloorNumber]);

  const currentFloor =
    selectedFloor != null
      ? data?.floors?.find((f) => f.number === selectedFloor) ?? data?.floors?.[0]
      : undefined;

  const routePathForCurrentFloor = useMemo(() => {
    if (!routeSegments || selectedFloor == null) return null;
    const seg = routeSegments.find((s) => s.floorNumber === selectedFloor);
    return seg?.path ?? null;
  }, [routeSegments, selectedFloor]);

  //  user clicks polygon -> we get name here
  const handleSelectPoiName = (name: string) => {
    if (!currentFloor) return;

    const poi = currentFloor.pois.find((p) => (p.name ?? "") === name);
    if (!poi) return;

    const point: SelectedPoint = {
      label: poi.name ?? "Room",
      floor: currentFloor.number,
      coord: { x: poi.position.x, y: poi.position.y },
    };

    if (nav.mode === "BROWSE") {
      nav.setSelectedRoom(point);
      return;
    }

    // ITINERARY: start already chosen when entering
    if (nav.start) {
      nav.setEnd(point);
      nav.clearRoute(); // trigger new backend call via controller
    } else {
      // fallback safety: if start missing, set it
      nav.setStart(point);
      nav.setPickMode("end");
      nav.clearRoute();
    }
  };

  //highlight:
  // - In itinerary: highlight the END (second room) if picked, else highlight START
  // - In browse: highlight the selectedRoom
  const highlightedPoiName =
    nav.mode === "ITINERARY"
      ? (nav.end?.label ?? nav.start?.label)
      : nav.selectedRoom?.label;

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

  if (selectedFloor === null || !currentFloor) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FloorPlanViewer
        key={selectedFloor}
        floor={currentFloor}
        routePath={routePathForCurrentFloor}
        // ✅ teammate selection props
        selectedPoiName={highlightedPoiName}
        onSelectPoiName={handleSelectPoiName}
      />

      <FloorSelector
        floors={data.floors}
        selectedFloor={selectedFloor}
        onSelectFloor={setSelectedFloor}
        bottomOffset={floorSelectorBottomOffset}
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