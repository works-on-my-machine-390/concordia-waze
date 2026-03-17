import { COLORS, DIRECTION_COLORS } from "@/app/constants";
import { formatIndoorPoiName } from "@/app/utils/indoorNameFormattingUtils";
import type { Coordinates } from "@/hooks/queries/indoorDirectionsQueries";
import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";
import { useEffect, useMemo, useRef, useState } from "react";
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
  initialSelectedPoiCoord?: Coordinates;
  disablePoiSelection?: boolean;
  navigationStartOverride?: Coordinates;
  navigationPathColor?: string;
  navigationStepIndex?: number;
  hideBottomSheetSection?: boolean;

  requireAccessible?: boolean;
  onAccessibilityRouteUnavailable?: () => void;
};

const normalizeName = (s: string) => s.trim().toLowerCase().replaceAll(/\s+/g, "");

function renderStatus(message: string, loading = false) {
  return (
    <View style={styles.emptyContainer}>
      {loading ? <ActivityIndicator size="large" /> : null}
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function findPoiByName(floor: Floor, name?: string | null) {
  if (!name) return null;

  return (
    floor.pois.find(
      (poi) => normalizeName(poi.name ?? "") === normalizeName(name ?? ""),
    ) ?? null
  );
}

function findPoiByExactName(floor: Floor, name: string) {
  return floor.pois.find((poi) => (poi.name ?? "") === name) ?? null;
}

function normalizePoiMatchName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[\s-]+/g, "");
}

function findPoiByInitialSelection(
  floor: Floor,
  name: string,
  buildingCode?: string,
) {
  const normalizedName = normalizePoiMatchName(name);

  return (
    floor.pois.find((poi) => {
      const poiName = poi.name ?? "";

      if (normalizePoiMatchName(poiName) === normalizedName) {
        return true;
      }

      if (!buildingCode) {
        return false;
      }

      const formattedPoiName = formatIndoorPoiName(
        poiName,
        poi.type ?? "",
        buildingCode,
      );

      return normalizePoiMatchName(formattedPoiName) === normalizedName;
    }) ?? null
  );
}

function findPoiByCoordinate(floor: Floor, coord?: Coordinates | null) {
  if (!coord) return null;

  return (
    floor.pois.find(
      (poi) =>
        Math.abs(poi.position.x - coord.x) < 0.000001 &&
        Math.abs(poi.position.y - coord.y) < 0.000001,
    ) ?? null
  );
}

function getPolygonOverride(
  poi:
    | {
        polygon?: Coordinates[];
        position: Coordinates;
      }
    | null
    | undefined,
) {
  return poi && (poi.polygon?.length ?? 0) <= 2
    ? { x: poi.position.x, y: poi.position.y }
    : undefined;
}

function setBrowseSelectedRoom(params: {
  floor: Floor;
  poi: {
    name?: string | null;
    position: Coordinates;
  } | null;
  setSelectedRoom: (value: {
    label: string;
    floor: number;
    coord: Coordinates;
  }) => void;
}) {
  const { floor, poi, setSelectedRoom } = params;
  if (!poi) return;

  setSelectedRoom({
    label: poi.name ?? "Room",
    floor: floor.number,
    coord: { x: poi.position.x, y: poi.position.y },
  });
}

function getRouteOverlayData(params: {
  floor: Floor;
  navMode: string;
  navStart?: { floor: number; label?: string | null } | null;
  navEnd?: { floor: number; label?: string | null } | null;
  navigationStartOverride?: Coordinates;
}) {
  const { floor, navMode, navStart, navEnd, navigationStartOverride } = params;

  const isEndOnCurrentFloor =
    navMode === "ITINERARY" && navEnd?.floor === floor.number;
  const isStartOnCurrentFloor =
    navMode === "ITINERARY" && navStart?.floor === floor.number;

  const destinationPoi = isEndOnCurrentFloor
    ? findPoiByName(floor, navEnd?.label)
    : null;

  const startPoi = isStartOnCurrentFloor
    ? findPoiByName(floor, navStart?.label)
    : null;

  const endPolygon =
    destinationPoi && (destinationPoi.polygon?.length ?? 0) > 2
      ? destinationPoi.polygon
      : undefined;

  return {
    endPolygon,
    startOverride: navigationStartOverride ?? getPolygonOverride(startPoi),
    endOverride: getPolygonOverride(destinationPoi),
  };
}

function renderPoiMarkers(params: {
  floor: Floor;
  displayWidth: number;
  displayHeight: number;
  effectiveSelectedPoiName?: string;
  extraSet: Set<string>;
  disablePoiSelection: boolean;
  handlePoiPress: (name: string) => void;
}) {
  const {
    floor,
    displayWidth,
    displayHeight,
    effectiveSelectedPoiName,
    extraSet,
    disablePoiSelection,
    handlePoiPress,
  } = params;

  return floor.pois.map((poi) => {
    const poiName = poi.name ?? "";
    const normalizedPoiName = normalizeName(poiName);

    const highlighted =
      (!!effectiveSelectedPoiName &&
        normalizedPoiName === normalizeName(effectiveSelectedPoiName)) ||
      extraSet.has(normalizedPoiName);

    return (
      <PoiMarker
        key={`poi-${poi.name}-${poi.position.x}-${poi.position.y}`}
        poi={poi}
        width={displayWidth}
        height={displayHeight}
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
  });
}

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
  initialSelectedPoiCoord,
  disablePoiSelection = false,
  navigationStartOverride,
  navigationPathColor,
  hideBottomSheetSection = false,
  requireAccessible = false,
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
  const consumedInitialSelectionKeyRef = useRef<string | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const { dimensions, svgText, error, isLoading } = useSvgDimensions(
    floor?.imgPath,
  );

  const effectiveSelectedPoiName = selectedPoiName ?? localSelectedPoiName;
  const bottomSheetSelectedPoiName =
    navMode === "BROWSE" ? effectiveSelectedPoiName : undefined;

  const extraSet = useMemo(
    () => new Set(extraHighlightedPoiNames.map((name) => normalizeName(name))),
    [extraHighlightedPoiNames],
  );

  const routeStyle = requireAccessible
    ? ROUTE_STYLE_ACCESSIBLE
    : ROUTE_STYLE_STANDARD;
  const resolvedPathColor = navigationPathColor ?? routeStyle.stroke;
  const initialSelectionKey = useMemo(() => {
    if (initialSelectedRoom) {
      return `room:${buildingCode ?? ""}:${floor?.number ?? "none"}:${normalizePoiMatchName(initialSelectedRoom)}`;
    }

    if (initialSelectedPoiCoord) {
      return `coord:${floor?.number ?? "none"}:${initialSelectedPoiCoord.x}:${initialSelectedPoiCoord.y}`;
    }

    return null;
  }, [
    buildingCode,
    floor?.number,
    initialSelectedRoom,
    initialSelectedPoiCoord,
  ]);

  useEffect(() => {
    if (initialSelectionKey == null) {
      consumedInitialSelectionKeyRef.current = null;
    }
  }, [initialSelectionKey]);

  useEffect(() => {
    if (!floor || navMode !== "BROWSE") return;
    if (initialSelectionKey == null) return;
    if (consumedInitialSelectionKeyRef.current === initialSelectionKey) return;

    const poi = initialSelectedRoom
      ? findPoiByInitialSelection(floor, initialSelectedRoom, buildingCode)
      : findPoiByCoordinate(floor, initialSelectedPoiCoord);

    consumedInitialSelectionKeyRef.current = initialSelectionKey;

    if (!poi) return;

    const poiName = poi.name ?? initialSelectedRoom ?? "Room";
    if (localSelectedPoiName === poiName) return;

    clearSelectedPoiFilter();
    setLocalSelectedPoiName(poiName);

    if (navSelectedRoom?.label !== poiName) {
      setBrowseSelectedRoom({ floor, poi, setSelectedRoom });
    }
  }, [
    initialSelectionKey,
    initialSelectedRoom,
    initialSelectedPoiCoord,
    buildingCode,
    floor,
    navMode,
    localSelectedPoiName,
    navSelectedRoom?.label,
    setSelectedRoom,
    clearSelectedPoiFilter,
  ]);

  if (!floor) {
    return renderStatus("No floor plan available");
  }

  if (error) {
    return renderStatus("Failed to load floor plan");
  }

  if (isLoading || !dimensions || !svgText) {
    return renderStatus("Loading floor plan...", true);
  }

  const displayWidth = screenWidth - 32;
  const displayHeight = displayWidth * (dimensions.height / dimensions.width);

  const { endPolygon, startOverride, endOverride } = getRouteOverlayData({
    floor,
    navMode,
    navStart,
    navEnd,
    navigationStartOverride,
  });

  const handlePoiPress = (name: string) => {
    if (disablePoiSelection) return;

    clearSelectedPoiFilter();

    if (onSelectPoiName) {
      onSelectPoiName(name);
      return;
    }

    setLocalSelectedPoiName(name);

    if (navMode !== "BROWSE") return;

    const poi = findPoiByExactName(floor, name);
    setBrowseSelectedRoom({ floor, poi, setSelectedRoom });
  };

  const showBottomSheetSection =
    !!buildingCode &&
    !!buildingName &&
    !disablePoiSelection &&
    !hideBottomSheetSection;

  const poiMarkers = renderPoiMarkers({
    floor,
    displayWidth,
    displayHeight,
    effectiveSelectedPoiName,
    extraSet,
    disablePoiSelection,
    handlePoiPress,
  });

  return (
    <View style={styles.container}>
      <ReactNativeZoomableView
        key={floor.number}
        maxZoom={5}
        minZoom={1}
        zoomStep={0.5}
        initialZoom={1}
        bindToBorders={false}
        contentWidth={displayWidth}
        contentHeight={displayHeight}
        style={{ flex: 1 }}
      >
        <View
          style={{
            width: displayWidth,
            height: displayHeight,
            position: "relative",
          }}
        >
          <SvgXml
            xml={svgText}
            width={displayWidth}
            height={displayHeight}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            preserveAspectRatio="xMidYMid meet"
          />

          <PolygonOverlay
            pois={floor.pois}
            width={displayWidth}
            height={displayHeight}
            selectedPoiName={effectiveSelectedPoiName}
            onSelectPoi={disablePoiSelection ? () => {} : handlePoiPress}
          />

          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {poiMarkers}
          </View>

          {routePath && routePath.length >= 2 ? (
            <IndoorPathOverlay
              path={routePath}
              width={displayWidth}
              height={displayHeight}
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
