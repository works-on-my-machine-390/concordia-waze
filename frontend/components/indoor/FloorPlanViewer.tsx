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
import { useLocalSearchParams, useRouter } from "expo-router";
import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";

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
  buildingName?: string;
  metroAccessible?: boolean;
};

const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

function renderStatus(message: string, loading = false) {
  return (
    <View style={styles.emptyContainer}>
      {loading ? <ActivityIndicator size="large" /> : null}
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function FloorPlanViewer({
  floor,
  buildingName,
  metroAccessible,
}: Readonly<Props>) {
  const params = useLocalSearchParams<IndoorMapPageParams>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { dimensions, svgText, error, isLoading } = useSvgDimensions(
    floor?.imgPath,
  );

  function renderPoiMarkers(parameters: {
    floor: Floor;
    displayWidth: number;
    displayHeight: number;
  }) {
    const { floor, displayWidth, displayHeight } = parameters;

    return floor.pois.map((poi) => {
      const highlighted = poi.name === params.selectedPoiName;
      return (
        <PoiMarker
          key={`poi-${poi.name}-${poi.position.x}-${poi.position.y}`}
          poi={poi}
          width={displayWidth}
          height={displayHeight}
          highlighted={highlighted}
          onPress={() => router.setParams({ selectedPoiName: poi.name })}
        />
      );
    });
  }

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

  const poiMarkers = renderPoiMarkers({
    floor,
    displayWidth,
    displayHeight,
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
            selectedPoiName={params.selectedPoiName}
            onSelectPoi={(name) => router.setParams({ selectedPoiName: name })}
          />

          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {poiMarkers}
          </View>
        </View>
      </ReactNativeZoomableView>

      <IndoorBottomSheetSection
        floor={floor}
        buildingName={buildingName}
        buildingCode={params.buildingCode}
        metroAccessible={metroAccessible}
        selectedPoiName={params.selectedPoiName}
        onClearSelectedPoi={() =>
          router.setParams({ selectedPoiName: undefined })
        }
        onDirectionsPress={() => {}}
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
