import { COLORS, DIRECTION_COLORS } from "@/app/constants";
import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SvgXml } from "react-native-svg";
import IndoorBottomSheetSection from "./IndoorBottomSheetSection";
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

/** Accessible indoor route*/
export const ROUTE_STYLE_ACCESSIBLE = {
  stroke: COLORS.accessibilityIcon,
  strokeWidth: 5,
  strokeDasharray: "12 6",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** detect backend error for no accessible route*/
export function isNoAccessibleRouteError(error: unknown): boolean {
  if (!error) return false;
  const stringifiedError = typeof error === "string" ? error : JSON.stringify(error);
  const msg = error instanceof Error ? error.message : stringifiedError;
}

type Props = {
  floor: Floor | undefined;
  buildingCode: string;
  buildingName: string;
  metroAccessible?: boolean;
  initialSelectedRoom?: string;
  requireAccessible?: boolean;
  onAccessibilityRouteUnavailable?: () => void;
};

export default function FloorPlanViewer({
  floor,
  buildingCode,
  buildingName,
  metroAccessible,
  initialSelectedRoom,
  requireAccessible = false,
  onAccessibilityRouteUnavailable,
}: Readonly<Props>) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { dimensions, svgText, error, isLoading } = useSvgDimensions(
    floor?.imgPath,
  );
  const [selectedPoiName, setSelectedPoiName] = useState<string | undefined>();
  const { clearSelectedPoiFilter } = useIndoorSearchStore();

  // PENDING #168: replace with useGetIndoorPath when indoor navigation is implemented
  const routeStyle = requireAccessible
    ? ROUTE_STYLE_ACCESSIBLE
    : ROUTE_STYLE_STANDARD;

  useEffect(() => {
    if (initialSelectedRoom && floor) {
      const roomExists = floor.pois.some(
        (poi) => poi.name === initialSelectedRoom,
      );
      if (roomExists) {
        clearSelectedPoiFilter();
        setSelectedPoiName(initialSelectedRoom);
      }
    }
  }, [initialSelectedRoom, floor]);

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

  return (
    <View style={styles.container}>
      <ReactNativeZoomableView
        key={floor?.number}
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
            selectedPoiName={selectedPoiName}
            onSelectPoi={(name) => {
              clearSelectedPoiFilter();
              setSelectedPoiName(name);
            }}
          />

          <View style={StyleSheet.absoluteFill}>
            {floor.pois.map((poi, index) => (
              <PoiMarker
                key={`poi-${poi.name}-${poi.position.x}-${poi.position.y}`}
                poi={poi}
                width={DISPLAY_WIDTH}
                height={DISPLAY_HEIGHT}
                onPress={() => {
                  clearSelectedPoiFilter();
                  setSelectedPoiName(poi.name);
                }}
              />
            ))}
          </View>
        </View>
      </ReactNativeZoomableView>
      <IndoorBottomSheetSection
        floor={floor}
        buildingName={buildingName}
        buildingCode={buildingCode}
        metroAccessible={metroAccessible}
        selectedPoiName={selectedPoiName}
        onClearSelectedPoi={() => setSelectedPoiName(undefined)}
      />
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