import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";

type Props = {
  pois: PointOfInterest[];
  width: number;
  height: number;
  onPickPoi: (poi: PointOfInterest) => void;

  // optional: restrict what can be selected (ex: ["room"])
  allowTypes?: string[];
};

export default function PoiPickOverlay({
  pois,
  width,
  height,
  onPickPoi,
  allowTypes,
}: Readonly<Props>) {
  const isAllowed = (poi: PointOfInterest) => {
    if (!allowTypes || allowTypes.length === 0) return true;
    return allowTypes
      .map((t) => t.toLowerCase())
      .includes(poi.type.toLowerCase());
  };

  // fallback radius for POIs with polygon: [] (stairs/elevator/etc.)
  const HIT_RADIUS = Math.max(14, Math.round(Math.min(width, height) * 0.02));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {pois.map((poi) => {
          if (!isAllowed(poi)) return null;

          // 1) If polygon exists -> tappable polygon
          if (poi.polygon && poi.polygon.length >= 3) {
            const points = poi.polygon
              .map((c) => `${c.x * width},${c.y * height}`)
              .join(" ");

            return (
              <Polygon
                key={`pick-poly-${poi.name}-${poi.position.x}-${poi.position.y}`}
                points={points}
                fill="rgba(0,0,0,0.001)" // invisible but tappable
                onPress={() => onPickPoi(poi)}
              />
            );
          }

          // 2) If polygon empty -> tappable circle around position
          const cx = poi.position.x * width;
          const cy = poi.position.y * height;

          return (
            <Circle
              key={`pick-circle-${poi.name}-${poi.position.x}-${poi.position.y}`}
              cx={cx}
              cy={cy}
              r={HIT_RADIUS}
              fill="rgba(0,0,0,0.001)"
              onPress={() => onPickPoi(poi)}
            />
          );
        })}
      </Svg>
    </View>
  );
}