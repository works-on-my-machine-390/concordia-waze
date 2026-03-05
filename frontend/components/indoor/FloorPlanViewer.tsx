import type { Floor } from "@/hooks/queries/indoorMapQueries";
import type { Coordinates } from "@/hooks/queries/indoorDirectionsQueries";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { useMemo, useState } from "react";

import IndoorPathOverlay from "./IndoorPathOverlay";
import PoiMarker from "./PoiMarker";
import PolygonOverlay from "./PolygonOverlay";
import IndoorBottomSheetSection from "./IndoorBottomSheetSection";

import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";

type Props = {
  // existing
  floor: Floor | undefined;

  // itinerary/path support (your stuff)
  routePath?: Coordinates[] | null;
  selectedPoiName?: string;
  onSelectPoiName?: (name: string) => void;
  extraHighlightedPoiNames?: string[];

  // browse bottom sheet support (their stuff)
  buildingCode?: string;
  buildingName?: string;
  metroAccessible?: boolean;
};

const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

export default function FloorPlanViewer({
  floor,
  routePath,
  selectedPoiName,
  onSelectPoiName,
  extraHighlightedPoiNames = [],
  buildingCode,
  buildingName,
  metroAccessible,
}: Readonly<Props>) {
  const nav = useIndoorNavigationStore();

  // Local selection only for the Browse bottom sheet "clear" action.
  // We do NOT force you to use this state for itinerary selection.
  const [localSelectedPoiName, setLocalSelectedPoiName] = useState<string | undefined>(
    undefined,
  );

  // Determine which selected name to show:
  // - if parent passes selectedPoiName, use it
  // - otherwise, use local one (browse)
  const effectiveSelectedPoiName = selectedPoiName ?? localSelectedPoiName;

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { dimensions, svgText, error, isLoading } = useSvgDimensions(
    floor?.imgPath,
  );

  if (!floor) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No floor plan available</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Failed to load floor plan</Text>
      </View>
    );
  }

  if (isLoading || !dimensions || !svgText) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.emptyText}>Loading floor plan...</Text>
      </View>
    );
  }

  const DISPLAY_WIDTH = SCREEN_WIDTH - 32;
  const DISPLAY_HEIGHT = DISPLAY_WIDTH * (dimensions.height / dimensions.width);

  const destinationPoi =
    nav.mode === "ITINERARY" && nav.end && nav.end.floor === floor.number
      ? floor.pois.find(
          (poi) =>
            normalizeName(poi.name ?? "") === normalizeName(nav.end?.label ?? ""),
        ) ?? null
      : null;

  const endPolygon =
    destinationPoi && (destinationPoi.polygon?.length ?? 0) > 2
      ? destinationPoi.polygon
      : undefined;

  // ✅ POI endpoint overrides (ONLY when POI has no polygon)
  const startPoi =
    nav.mode === "ITINERARY" && nav.start && nav.start.floor === floor.number
      ? floor.pois.find(
          (poi) =>
            normalizeName(poi.name ?? "") === normalizeName(nav.start?.label ?? ""),
        ) ?? null
      : null;

  const startOverride =
    startPoi && (startPoi.polygon?.length ?? 0) <= 2
      ? { x: startPoi.position.x, y: startPoi.position.y }
      : undefined;

  const endOverride =
    destinationPoi && (destinationPoi.polygon?.length ?? 0) <= 2
      ? { x: destinationPoi.position.x, y: destinationPoi.position.y }
      : undefined;

  // normalize extra highlight set once
  const extraSet = useMemo(() => {
    return new Set(extraHighlightedPoiNames.map((n) => normalizeName(n)));
  }, [extraHighlightedPoiNames]);

  const handlePoiPress = (name: string) => {
    // If parent provided handler (itinerary logic), use it
    if (onSelectPoiName) {
      onSelectPoiName(name);
      return;
    }

    // Otherwise fallback to local selection for browse bottom sheet
    setLocalSelectedPoiName(name);
  };

  const showBottomSheetSection =
    !!buildingCode && !!buildingName; // keep it safe (only render if we have required props)

  return (
    <View style={styles.container}>
      <ReactNativeZoomableView
        key={floor.number}
        maxZoom={5}
        minZoom={1}
        zoomStep={0.5}
        initialZoom={1}
        bindToBorders={false}
        contentWidth={DISPLAY_WIDTH}
        contentHeight={DISPLAY_HEIGHT}
        style={{ flex: 1 }}
      >
        <View
          style={{
            width: DISPLAY_WIDTH,
            height: DISPLAY_HEIGHT,
            position: "relative",
          }}
        >
          <SvgXml
            xml={svgText}
            width={DISPLAY_WIDTH}
            height={DISPLAY_HEIGHT}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            preserveAspectRatio="xMidYMid meet"
          />

          <PolygonOverlay
            pois={floor.pois}
            width={DISPLAY_WIDTH}
            height={DISPLAY_HEIGHT}
            selectedPoiName={effectiveSelectedPoiName}
            onSelectPoi={handlePoiPress}
          />

          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {floor.pois.map((poi) => {
              const poiName = poi.name ?? "";
              const nrm = normalizeName(poiName);

              const highlighted =
                (!!effectiveSelectedPoiName &&
                  nrm === normalizeName(effectiveSelectedPoiName)) ||
                extraSet.has(nrm);

              return (
                <PoiMarker
                  key={`poi-${poi.name}-${poi.position.x}-${poi.position.y}`}
                  poi={poi}
                  width={DISPLAY_WIDTH}
                  height={DISPLAY_HEIGHT}
                  highlighted={highlighted}
                  onPress={() => {
                    const name = poi.name ?? "";
                    if (name) handlePoiPress(name);
                  }}
                />
              );
            })}
          </View>

          {routePath && routePath.length >= 2 ? (
            <IndoorPathOverlay
              path={routePath}
              width={DISPLAY_WIDTH}
              height={DISPLAY_HEIGHT}
              endPolygon={endPolygon} // ✅ rooms keep same behavior
              startOverride={startOverride} // ✅ POIs only (selected start)
              endOverride={endOverride} // ✅ POIs only (selected dest)
            />
          ) : null}
        </View>
      </ReactNativeZoomableView>

      {showBottomSheetSection ? (
        <IndoorBottomSheetSection
          floor={floor}
          buildingName={buildingName!}
          buildingCode={buildingCode!}
          metroAccessible={metroAccessible}
          selectedPoiName={effectiveSelectedPoiName}
          onClearSelectedPoi={() => {
            // If parent controls selection, clear by telling parent (best-effort)
            if (onSelectPoiName) {
              onSelectPoiName(""); // depends on your parent logic; safer is local clear only
            }
            setLocalSelectedPoiName(undefined);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
});