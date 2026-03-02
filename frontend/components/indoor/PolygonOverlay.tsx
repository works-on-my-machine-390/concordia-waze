import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg from "react-native-svg";
import RoomPolygon from "./RoomPolygon";

type Props = {
  pois: PointOfInterest[];
  width: number;
  height: number;
  selectedPoiName?: string;
  onSelectPoi?: (name: string) => void;
};

const PolygonOverlay = memo(
  ({ pois, width, height, selectedPoiName, onSelectPoi }: Props) => {
    return (
      <View style={styles.overlay} pointerEvents="box-none">
        <Svg width={width} height={height}>
          {pois
            .filter((poi) => poi.polygon.length > 0)
            .map((poi) => (
              <RoomPolygon
                key={`room-${poi.name}-${poi.position.x}-${poi.position.y}`}
                polygon={poi.polygon}
                width={width}
                height={height}
                isSelected={poi.name === selectedPoiName}
                onPress={() => onSelectPoi?.(poi.name)}
              />
            ))}
        </Svg>
      </View>
    );
  },
);

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
