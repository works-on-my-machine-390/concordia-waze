import type { Coordinate } from "@/hooks/queries/indoorMapQueries";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

type Props = {
  polygon: Coordinate[];
  width: number;
  height: number;

  // ✅ NEW
  highlighted?: boolean;
};

export default function RoomPolygon({
  polygon,
  width,
  height,
  highlighted = false,
}: Readonly<Props>) {
  if (polygon.length < 3) return null;

  const points = polygon
    .map((coord) => `${coord.x * width},${coord.y * height}`)
    .join(" ");

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Polygon
          points={points}
          fill={
            highlighted
              ? "rgba(30,115,255,0.25)" // ✅ blue highlight
              : "rgba(145,35,56,0.15)"
          }
          stroke={highlighted ? "#1E73FF" : "#912338"}
          strokeWidth={highlighted ? 3 : 2}
        />
      </Svg>
    </View>
  );
}