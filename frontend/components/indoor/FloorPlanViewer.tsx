import { View, ScrollView, StyleSheet, Dimensions, Text } from "react-native";
import { SvgUri } from "react-native-svg";
import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { API_URL } from "@/hooks/api";
import RoomPolygon from "./RoomPolygon";

type Props = {
  floor: Floor | undefined;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const FLOOR_PLAN_WIDTH = SCREEN_WIDTH - 32;
const FLOOR_PLAN_HEIGHT = FLOOR_PLAN_WIDTH * (762 / 829);

export default function FloorPlanViewer({ floor }: Props) {
  if (!floor) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No floor plan available</Text>
      </View>
    );
  }

  const svgUrl = `${API_URL}/images/${floor.imgPath}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.floorPlanContainer}>
        <SvgUri width={FLOOR_PLAN_WIDTH} height={FLOOR_PLAN_HEIGHT} uri={svgUrl} />

        <View style={styles.overlay}>
          {floor.pois
            .filter((poi) => poi.polygon.length > 0)
            .map((poi, index) => (
              <RoomPolygon
                key={`room-${index}`}
                polygon={poi.polygon}
                name={poi.name}
                width={FLOOR_PLAN_WIDTH}
                height={FLOOR_PLAN_HEIGHT}
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
    padding: 16,
  },
  floorPlanContainer: {
    position: "relative",
    width: FLOOR_PLAN_WIDTH,
    height: FLOOR_PLAN_HEIGHT,
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  },
});