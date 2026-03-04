import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { StyleSheet, View } from "react-native";
import IndoorFloorBottomSheet from "./IndoorFloorBottomSheet";

export type IndoorBottomSheetSectionProps = {
  floor: Floor | undefined;
  buildingCode: string;
  buildingName: string;
  metroAccessible?: boolean;
};

/**
 * Collection of all bottom sheets used on the indoor map page.
 */
export default function IndoorBottomSheetSection(
  props: Readonly<IndoorBottomSheetSectionProps>,
) {
  const { floor, buildingCode, buildingName, metroAccessible } = props;

  return (
    <View style={indoorBottomSheetStyles.bottomSheetContainer}>
 
      {floor && (
        <IndoorFloorBottomSheet
          floor={floor}
          buildingName={buildingName}
          buildingCode={buildingCode}
          metroAccessible={metroAccessible}
        />
      )}
    </View>
  );
}

const indoorBottomSheetStyles = StyleSheet.create({
  bottomSheetContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    pointerEvents: "box-none",
  },
});