import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import type { Coordinate } from "@/hooks/queries/indoorMapQueries";

type Props = {
  polygon: Coordinate[];
  name: string;
  width: number;
  height: number;
};

export default function RoomPolygon({ polygon, name, width, height }: Props) {
  if (polygon.length < 3) {
    return null;
  }

  const points = polygon
    .map((coord) => `${coord.x * width},${coord.y * height}`)
    .join(" ");

  const centerX =
    polygon.reduce((sum, coord) => sum + coord.x, 0) / polygon.length;
  const centerY =
    polygon.reduce((sum, coord) => sum + coord.y, 0) / polygon.length;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Polygon
          points={points}
          fill="rgba(145, 35, 56, 0.15)"
          stroke="#912338"
          strokeWidth="2"
        />
      </Svg>

      <View
        style={[
          styles.label,
          {
            left: centerX * width - 50,
            top: centerY * height - 10,
          },
        ]}
      >
        <Text style={styles.labelText} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    width: 100,
    alignItems: "center",
  },
  labelText: {
    fontSize: 10,
    color: "#912338",
    fontWeight: "600",
  },
});