import FloorPlanViewer from "@/components/indoor/FloorPlanViewer";
import FloorSelector from "@/components/indoor/FloorSelector";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
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

  routeSegments?: FloorSegment[] | null;
  preferredFloorNumber?: number | null;

  floorSelectorBottomOffset?: number;
};

const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
const normalizeType = (s?: string) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, "_");

const isTransitionPoi = (type?: string) => {
  const t = normalizeType(type);
  return t === "stairs" || t === "elevator";
};

const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const findNearestTransitionPoi = (
  pois: { type?: string; name?: string | null; position: { x: number; y: number } }[],
  point: { x: number; y: number },
) => {
  let best: (typeof pois)[number] | null = null;
  let bestD = Number.POSITIVE_INFINITY;

  for (const poi of pois) {
    if (!isTransitionPoi(poi.type)) continue;
    const d = dist2(poi.position, point);
    if (d < bestD) {
      bestD = d;
      best = poi;
    }
  }
  return best;
};

// Optional but recommended (prevents tiny “stub” dotted segments)
const cleanPath = (pts: Coordinates[]) => {
  if (pts.length < 2) return pts;

  const out: Coordinates[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    const curr = pts[i];
    const dx = prev.x - curr.x;
    const dy = prev.y - curr.y;
    if (dx * dx + dy * dy > 0.0000005) out.push(curr);
  }
  return out;
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
  const { data: buildingData } = useGetBuildingDetails(buildingCode);

  useEffect(() => {
    if (!data?.floors?.length) return;

    if (preferredFloorNumber != null) {
      setSelectedFloor(preferredFloorNumber);
      nav.setCurrentFloor?.(preferredFloorNumber);
      return;
    }

    const last = nav.currentFloor ?? null;
    if (last != null && data.floors.some((f) => f.number === last)) {
      setSelectedFloor(last);
      return;
    }

    setSelectedFloor(data.floors[0].number);
    nav.setCurrentFloor?.(data.floors[0].number);
  }, [buildingCode, data?.floors, preferredFloorNumber]);

  const currentFloor =
    selectedFloor != null
      ? data?.floors?.find((f) => f.number === selectedFloor) ?? data?.floors?.[0]
      : undefined;

  // ✅ path for current floor + extra highlighted transition POIs
  const { routePathForCurrentFloor, extraHighlightedPoiNames } = useMemo(() => {
    if (!routeSegments || selectedFloor == null || !data?.floors?.length) {
      return {
        routePathForCurrentFloor: null as Coordinates[] | null,
        extraHighlightedPoiNames: [] as string[],
      };
    }

    const idx = routeSegments.findIndex((s) => s.floorNumber === selectedFloor);
    if (idx === -1) {
      return {
        routePathForCurrentFloor: null as Coordinates[] | null,
        extraHighlightedPoiNames: [] as string[],
      };
    }

    const seg = routeSegments[idx];
    const path = seg?.path ?? null;
    if (!path || path.length < 2) {
      return { routePathForCurrentFloor: path, extraHighlightedPoiNames: [] as string[] };
    }

    // Only apply snapping/highlighting if route spans multiple floors
    if (routeSegments.length < 2) {
      return { routePathForCurrentFloor: path, extraHighlightedPoiNames: [] as string[] };
    }

    const floorObj =
      data.floors.find((f) => f.number === selectedFloor) ?? data.floors[0];

    const pois = floorObj?.pois ?? [];
    const adjusted = [...path];
    const extraNames: string[] = [];

    // incoming transition (start of segment) if not first segment
    if (idx > 0) {
      const startPt = adjusted[0];
      const nearest = findNearestTransitionPoi(pois as any, startPt);
      if (nearest?.name) {
        extraNames.push(nearest.name);
        adjusted[0] = { x: nearest.position.x, y: nearest.position.y };
      }
    }

    // outgoing transition (end of segment) if not last segment
    if (idx < routeSegments.length - 1) {
      const endPt = adjusted[adjusted.length - 1];
      const nearest = findNearestTransitionPoi(pois as any, endPt);
      if (nearest?.name) {
        extraNames.push(nearest.name);
        adjusted[adjusted.length - 1] = {
          x: nearest.position.x,
          y: nearest.position.y,
        };
      }
    }

    const unique = Array.from(new Set(extraNames.map(normalizeName))).map((nrm) => {
      const found = extraNames.find((x) => normalizeName(x) === nrm);
      return found ?? nrm;
    });

    return {
      routePathForCurrentFloor: cleanPath(adjusted),
      extraHighlightedPoiNames: unique,
    };
  }, [routeSegments, selectedFloor, data?.floors]);

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

    if (nav.start) {
      nav.setEnd(point);
      nav.clearRoute();
    } else {
      nav.setStart(point);
      nav.setPickMode("end");
      nav.clearRoute();
    }
  };

  const highlightedPoiName =
    nav.mode === "ITINERARY"
      ? nav.end?.label ?? nav.start?.label
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
        // ✅ itinerary stuff
        routePath={routePathForCurrentFloor}
        selectedPoiName={highlightedPoiName}
        onSelectPoiName={handleSelectPoiName}
        extraHighlightedPoiNames={extraHighlightedPoiNames}
        // ✅ teammate bottom sheet stuff
        buildingCode={buildingCode}
        buildingName={buildingData?.long_name || ""}
        metroAccessible={buildingData?.metro_accessible}
      />

      <FloorSelector
        floors={data.floors}
        selectedFloor={selectedFloor}
        onSelectFloor={(floorNum) => {
          setSelectedFloor(floorNum);
          nav.setCurrentFloor?.(floorNum);
        }}
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