import BottomSheet from "@gorhom/bottom-sheet";
import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { COLORS } from "../../app/constants";
import { ElevatorIcon, SlopeUpIcon, WheelchairIcon } from "../../app/icons";
import MetroAccessibleChip from "../MetroAccessibleChip";
import { BottomSheetStyles } from "../BuildingBottomSheet";

export type IndoorFloorBottomSheetProps = {
  floor: Floor;
  buildingCode: string;
  buildingName: string;
  metroAccessible?: boolean;
};

export default function IndoorFloorBottomSheet(
  props: Readonly<IndoorFloorBottomSheetProps>,
) {
  const { buildingName, buildingCode, floor, metroAccessible } = props;

  const snapPoints = useMemo(() => ["15%"], []);
  const handleSheetChanges = useCallback((_index: number) => {}, []);

  const hasElevator = floor.pois.some(
    (poi) => poi.type.toLowerCase() === "elevator",
  );
  const hasRamp = floor.pois.some((poi) => poi.type.toLowerCase() === "ramp");

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={false}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}>
      </View>

      <View style={BottomSheetStyles.headerContainer}>
        <View style={BottomSheetStyles.textContainer}>
          <Text
            style={BottomSheetStyles.name}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {buildingName} ({buildingCode}) - {ordinalFloor(floor.number)} Floor
          </Text>
        </View>

        <View style={BottomSheetStyles.iconsContainer}>
          <View style={BottomSheetStyles.accessibilityIconsContainer}>
            {hasElevator || hasRamp ? (
              <WheelchairIcon color={COLORS.accessibilityIcon} size={28} />
            ) : null}
            {hasElevator && (
              <ElevatorIcon color={COLORS.accessibilityIcon} size={28} />
            )}
            {hasRamp && (
              <SlopeUpIcon color={COLORS.accessibilityIcon} size={28} />
            )}
            {metroAccessible && <MetroAccessibleChip />}
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

function ordinalFloor(num: number): string {
  // If negative, convert -2 -> S2
  if (num < 0) {
    return "S" + Math.abs(num);
  }

  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return num + "st";
  if (j === 2 && k !== 12) return num + "nd";
  if (j === 3 && k !== 13) return num + "rd";
  return num + "th";
}
