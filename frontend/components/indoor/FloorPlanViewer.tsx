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
import IndoorPathOverlay from "./IndoorPathOverlay";
import PoiMarker from "./PoiMarker";
import PolygonOverlay from "./PolygonOverlay";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";

type Props = {
  floor: Floor | undefined;

  routePath?: Coordinates[] | null;

  selectedPoiName?: string;
  onSelectPoiName?: (name: string) => void;
};

const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

export default function FloorPlanViewer({
  floor,
  routePath,
  selectedPoiName,
  onSelectPoiName,
}: Readonly<Props>) {
  const nav = useIndoorNavigationStore();

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

          {}
          <PolygonOverlay
            pois={floor.pois}
            width={DISPLAY_WIDTH}
            height={DISPLAY_HEIGHT}
            selectedPoiName={selectedPoiName}
            onSelectPoi={onSelectPoiName}
            // destinationPoiName={destinationPoi?.name ?? null}
          />

          {}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {floor.pois.map((poi) => (
              <PoiMarker
                key={`poi-${poi.name}-${poi.position.x}-${poi.position.y}`}
                poi={poi}
                width={DISPLAY_WIDTH}
                height={DISPLAY_HEIGHT}
              />
            ))}
          </View>

          {}
          {routePath && routePath.length >= 2 ? (
            <IndoorPathOverlay
              path={routePath}
              width={DISPLAY_WIDTH}
              height={DISPLAY_HEIGHT}
              endPolygon={endPolygon}
            />
          ) : null}
        </View>
      </ReactNativeZoomableView>
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