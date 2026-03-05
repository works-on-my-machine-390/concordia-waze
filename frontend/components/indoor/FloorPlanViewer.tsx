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
  floor: Floor | undefined;

  routePath?: Coordinates[] | null;
  selectedPoiName?: string;
  onSelectPoiName?: (name: string) => void;
  extraHighlightedPoiNames?: string[];

  buildingCode?: string;
  buildingName?: string;
  metroAccessible?: boolean;
};

const normalizeName = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "");

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

  const [localSelectedPoiName, setLocalSelectedPoiName] = useState<
    string | undefined
  >(undefined);

  const effectiveSelectedPoiName = selectedPoiName ?? localSelectedPoiName;

  // ✅ Bottom sheet should only appear in BROWSE mode
  const bottomSheetSelectedPoiName =
    nav.mode === "BROWSE" ? effectiveSelectedPoiName : undefined;

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
            normalizeName(poi.name ?? "") ===
            normalizeName(nav.end?.label ?? ""),
        ) ?? null
      : null;

  const endPolygon =
    destinationPoi && (destinationPoi.polygon?.length ?? 0) > 2
      ? destinationPoi.polygon
      : undefined;

  const startPoi =
    nav.mode === "ITINERARY" && nav.start && nav.start.floor === floor.number
      ? floor.pois.find(
          (poi) =>
            normalizeName(poi.name ?? "") ===
            normalizeName(nav.start?.label ?? ""),
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

  const extraSet = useMemo(() => {
    return new Set(extraHighlightedPoiNames.map((n) => normalizeName(n)));
  }, [extraHighlightedPoiNames]);

  const handlePoiPress = (name: string) => {
    if (onSelectPoiName) {
      onSelectPoiName(name);
      return;
    }

    setLocalSelectedPoiName(name);
  };

  const showBottomSheetSection = !!buildingCode && !!buildingName;

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
              endPolygon={endPolygon}
              startOverride={startOverride}
              endOverride={endOverride}
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
          selectedPoiName={bottomSheetSelectedPoiName}
          onClearSelectedPoi={() => {
            setLocalSelectedPoiName(undefined);
            nav.setSelectedRoom(null);
          }}
          onDirectionsPress={() => {
            nav.enterItineraryFromSelected();
            setLocalSelectedPoiName(undefined);
            nav.setSelectedRoom(null);
          }}
          directionsDisabled={!nav.selectedRoom}
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