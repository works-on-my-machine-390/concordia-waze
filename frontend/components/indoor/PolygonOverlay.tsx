import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import RoomPolygon from "./RoomPolygon";

type Props = {
  pois: PointOfInterest[];
  width: number;
  height: number;
};

const PolygonOverlay = memo(({ pois, width, height }: Props) => {
  return (
    <View style={styles.overlay}>
      {pois
        .filter((poi) => poi.polygon.length > 0)
        .map((poi, index) => (
          <RoomPolygon
            key={`room-${poi.name}-${poi.position.x}-${poi.position.y}`}
            polygon={poi.polygon}
            width={width}
            height={height}
          />
        ))}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
});

export default PolygonOverlay;
