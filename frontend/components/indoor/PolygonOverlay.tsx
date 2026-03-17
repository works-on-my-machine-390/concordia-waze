import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg from "react-native-svg";
import RoomPolygon from "./RoomPolygon";

type Props = {
  pois: PointOfInterest[];
  width: number;
  height: number;

  selectedPoiName?: string;
  onSelectPoi?: (poi: PointOfInterest) => void;
};

const PolygonOverlay = memo(
  ({ pois, width, height, selectedPoiName, onSelectPoi }: Props) => {
    return (
      <View style={styles.overlay} pointerEvents="box-none">
        {}
        <Svg width={width} height={height}>
          {pois
            .filter((poi) => (poi.polygon?.length ?? 0) > 2)
            .map((poi) => {
              const isSelected = poi.name === selectedPoiName;

              return (
                <RoomPolygon
                  key={`room-${poi.name}-${poi.position.x}-${poi.position.y}`}
                  polygon={poi.polygon}
                  width={width}
                  height={height}
                  isSelected={isSelected}
                  onPress={() => onSelectPoi?.(poi)}
                />
              );
            })}
        </Svg>
      </View>
    );
  },
);

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
