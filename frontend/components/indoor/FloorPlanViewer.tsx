import { COLORS, DIRECTION_COLORS } from "@/app/constants";
import type { Coordinates } from "@/hooks/queries/indoorDirectionsQueries";
import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SvgXml } from "react-native-svg";

import IndoorBottomSheetSection from "./IndoorBottomSheetSection";
import IndoorPathOverlay from "./IndoorPathOverlay";
import PoiMarker from "./PoiMarker";
import PolygonOverlay from "./PolygonOverlay";

/** Standard indoor route */
export const ROUTE_STYLE_STANDARD = {
  stroke: DIRECTION_COLORS.walking,
  strokeWidth: 3,
  strokeDasharray: undefined,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Accessible indoor route */
export const ROUTE_STYLE_ACCESSIBLE = {
  stroke: COLORS.accessibilityIcon,
  strokeWidth: 5,
  strokeDasharray: "12 6",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** detect backend error for no accessible route */
export function isNoAccessibleRouteError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    return error.message.toLowerCase().includes("no transition point");
  }
  const raw = typeof error === "string" ? error : JSON.stringify(error);
  return raw.toLowerCase().includes("no transition point");
}

type Props = {
  floor: Floor | undefined;

  routePath?: Coordinates[] | null;
  selectedPoiName?: string;
  onSelectPoiName?: (name: string) => void;
  extraHighlightedPoiNames?: string[];

  buildingCode?: string;
  buildingName?: string;
  metroAccessible?: boolean;

  initialSelectedRoom?: string;
  disablePoiSelection?: boolean;
  navigationStartOverride?: Coordinates;
  navigationPathColor?: string;
  navigationStepIndex?: number;
  hideBottomSheetSection?: boolean;

  requireAccessible?: boolean;
  onAccessibilityRouteUnavailable?: () => void;
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
  initialSelectedRoom,
  disablePoiSelection = false,
  navigationStartOverride,
  navigationPathColor,
  navigationStepIndex,
  hideBottomSheetSection = false,
  requireAccessible = false,
  onAccessibilityRouteUnavailable: _onAccessibilityRouteUnavailable,
}: Readonly<Props>) {
  const navMode = useIndoorNavigationStore((s) => s.mode);
  const navEnd = useIndoorNavigationStore((s) => s.end);
  const navStart = useIndoorNavigationStore((s) => s.start);
  const navSelectedRoom = useIndoorNavigationStore((s) => s.selectedRoom);
  const setSelectedRoom = useIndoorNavigationStore((s) => s.setSelectedRoom);
  const enterItineraryFromSelected = useIndoorNavigationStore(
    (s) => s.enterItineraryFromSelected,
  );

  const clearSelectedPoiFilter = useIndoorSearchStore(
    (s) => s.clearSelectedPoiFilter,
  );

  const [localSelectedPoiName, setLocalSelectedPoiName] = useState<
    string | undefined
  >(undefined);

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { dimensions, svgText, error, isLoading } = useSvgDimensions(
    floor?.imgPath,
  );

  const effectiveSelectedPoiName = selectedPoiName ?? localSelectedPoiName;

  const bottomSheetSelectedPoiName =
    navMode === "BROWSE" ? effectiveSelectedPoiName : undefined;

  const extraSet = useMemo(() => {
    return new Set(extraHighlightedPoiNames.map((n) => normalizeName(n)));
  }, [extraHighlightedPoiNames]);

  // For now accessibility mode only changes route styling here.
  // The actual accessible path request can be plugged in later.
  const routeStyle = requireAccessible
    ? ROUTE_STYLE_ACCESSIBLE
    : ROUTE_STYLE_STANDARD;

  const resolvedPathColor = navigationPathColor ?? routeStyle.stroke;

  void navigationStepIndex;
  void _onAccessibilityRouteUnavailable;

  useEffect(() => {
    if (!initialSelectedRoom || !floor || navMode !== "BROWSE") return;
    if (localSelectedPoiName === initialSelectedRoom) return;

    const poi = floor.pois.find((p) => p.name === initialSelectedRoom);
    if (!poi) return;

    clearSelectedPoiFilter();
    setLocalSelectedPoiName(initialSelectedRoom);

    if (navSelectedRoom?.label !== initialSelectedRoom) {
      setSelectedRoom({
        label: poi.name ?? "Room",
        floor: floor.number,
        coord: { x: poi.position.x, y: poi.position.y },
      });
    }
  }, [
    initialSelectedRoom,
    floor,
    navMode,
    localSelectedPoiName,
    navSelectedRoom?.label,
    setSelectedRoom,
    clearSelectedPoiFilter,
  ]);

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
    navMode === "ITINERARY" && navEnd && navEnd.floor === floor.number
      ? floor.pois.find(
          (poi) =>
            normalizeName(poi.name ?? "") === normalizeName(navEnd.label ?? ""),
        ) ?? null
      : null;

  const endPolygon =
    destinationPoi && (destinationPoi.polygon?.length ?? 0) > 2
      ? destinationPoi.polygon
      : undefined;

  const startPoi =
    navMode === "ITINERARY" && navStart && navStart.floor === floor.number
      ? floor.pois.find(
          (poi) =>
            normalizeName(poi.name ?? "") ===
            normalizeName(navStart.label ?? ""),
        ) ?? null
      : null;

  const startOverride =
    navigationStartOverride ??
    (startPoi && (startPoi.polygon?.length ?? 0) <= 2
      ? { x: startPoi.position.x, y: startPoi.position.y }
      : undefined);

  const endOverride =
    destinationPoi && (destinationPoi.polygon?.length ?? 0) <= 2
      ? { x: destinationPoi.position.x, y: destinationPoi.position.y }
      : undefined;

  const handlePoiPress = (name: string) => {
    if (disablePoiSelection) return;

    clearSelectedPoiFilter();

    if (onSelectPoiName) {
      onSelectPoiName(name);
      return;
    }

    setLocalSelectedPoiName(name);

    if (navMode === "BROWSE") {
      const poi = floor.pois.find((p) => (p.name ?? "") === name);
      if (poi) {
        setSelectedRoom({
          label: poi.name ?? "Room",
          floor: floor.number,
          coord: { x: poi.position.x, y: poi.position.y },
        });
      }
    }
  };

  const showBottomSheetSection =
    !!buildingCode &&
    !!buildingName &&
    !disablePoiSelection &&
    !hideBottomSheetSection;

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
            onSelectPoi={disablePoiSelection ? () => {} : handlePoiPress}
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
                  onPress={
                    disablePoiSelection
                      ? undefined
                      : () => {
                          const name = poi.name ?? "";
                          if (name) handlePoiPress(name);
                        }
                  }
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
              color={resolvedPathColor}
            />
          ) : null}
        </View>
      </ReactNativeZoomableView>

      {showBottomSheetSection ? (
        <IndoorBottomSheetSection
          floor={floor}
          buildingName={buildingName}
          buildingCode={buildingCode}
          metroAccessible={metroAccessible}
          selectedPoiName={bottomSheetSelectedPoiName}
          onClearSelectedPoi={() => {
            clearSelectedPoiFilter();
            setLocalSelectedPoiName(undefined);
            setSelectedRoom(null);
          }}
          onDirectionsPress={() => {
            clearSelectedPoiFilter();
            setLocalSelectedPoiName(undefined);
            enterItineraryFromSelected();
          }}
          directionsDisabled={!navSelectedRoom}
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