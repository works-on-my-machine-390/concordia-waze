import { View, StyleSheet } from "react-native";
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
    </View>
  );
}