import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

export default function FloorPlanViewer({ floor }: Readonly<Props>) {
  const zoomableViewRef = useRef<ReactNativeZoomableView>(null);
  const { dimensions, svgText, error, isLoading } = useSvgDimensions(
    floor?.imgPath,
  );

  // Reset zoom when floor changes
  useEffect(() => {
    if (zoomableViewRef.current) {
      setTimeout(() => {
        zoomableViewRef.current?.zoomTo(1);
        zoomableViewRef.current?.moveTo(0, 0);
      }, 100);
    }
  }, [floor?.number]);

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
        ref={zoomableViewRef}
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
          />

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {floor.pois.map((poi, index) => (
              <PoiMarker
                key={`poi-${poi.name}-${poi.position.x}-${poi.position.y}`}
                poi={poi}
                width={DISPLAY_WIDTH}
                height={DISPLAY_HEIGHT}
              />
            ))}
          </View>
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
