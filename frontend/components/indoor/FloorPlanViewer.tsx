import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import PoiMarker from "./PoiMarker";
import PolygonOverlay from "./PolygonOverlay";

type Props = {
  floor: Floor | undefined;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function FloorPlanViewer({ floor }: Props) {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      maximumZoomScale={5}
      minimumZoomScale={0.5}
      bouncesZoom={true}
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
        />

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {floor.pois.map((poi, index) => (
            <PoiMarker
              key={`poi-${index}`}
              poi={poi}
              width={DISPLAY_WIDTH}
              height={DISPLAY_HEIGHT}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
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
