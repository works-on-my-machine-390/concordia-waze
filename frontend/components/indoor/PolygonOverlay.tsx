import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import RoomPolygon from "./RoomPolygon";

type Props = {
  pois: PointOfInterest[];
  width: number;
  height: number;

  // ✅ destination room to highlight
  destinationPoi?: PointOfInterest | null;
};

function PolygonOverlayBase({
  pois,
  width,
  height,
  destinationPoi = null,
}: Readonly<Props>) {
  const destName = (destinationPoi?.name ?? "").trim().toLowerCase();

  return (
    <View style={styles.overlay}>
      {pois
        .filter((poi) => (poi.polygon?.length ?? 0) > 2)
        .map((poi) => {
          const isDest =
            destName.length > 0 &&
            (poi.name ?? "").trim().toLowerCase() === destName;

          return (
            <RoomPolygon
              key={`room-${poi.name}-${poi.position.x}-${poi.position.y}`}
              polygon={poi.polygon}
              width={width}
              height={height}
              highlighted={isDest}
            />
          );
        })}
    </View>
  );
}

const PolygonOverlay = memo(PolygonOverlayBase);
export default PolygonOverlay;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
});