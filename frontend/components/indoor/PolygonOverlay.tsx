import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg from "react-native-svg";
import RoomPolygon from "./RoomPolygon";

type Props = {
  pois: PointOfInterest[];
  width: number;
  height: number;

  // ✅ teammate feature: selected polygon via tap
  selectedPoiName?: string;
  onSelectPoi?: (name: string) => void;

  // ✅ NEW (keeps your feature without removing hers):
  // if provided, this room is highlighted (ex: itinerary destination)
  destinationPoiName?: string | null;
};

const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

const PolygonOverlay = memo(
  ({
    pois,
    width,
    height,
    selectedPoiName,
    onSelectPoi,
    destinationPoiName = null,
  }: Props) => {
    // ✅ destination highlight has priority over manual selection
    const effectiveSelectedName =
      destinationPoiName && destinationPoiName.trim().length > 0
        ? destinationPoiName
        : selectedPoiName;

    const normalizedSelected = effectiveSelectedName
      ? normalizeName(effectiveSelectedName)
      : "";

    return (
      <View style={styles.overlay} pointerEvents="box-none">
        {/* ✅ KEEP her: all polygons in ONE SVG so they are pressable */}
        <Svg width={width} height={height}>
          {pois
            .filter((poi) => (poi.polygon?.length ?? 0) > 2)
            .map((poi) => {
              const isSelected =
                normalizedSelected.length > 0 &&
                normalizeName(poi.name ?? "") === normalizedSelected;

              return (
                <RoomPolygon
                  key={`room-${poi.name}-${poi.position.x}-${poi.position.y}`}
                  polygon={poi.polygon}
                  width={width}
                  height={height}
                  isSelected={isSelected} // ✅ her API
                  onPress={() => onSelectPoi?.(poi.name)} // ✅ her behavior
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