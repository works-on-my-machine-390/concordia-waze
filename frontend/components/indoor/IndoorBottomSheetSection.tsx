import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { StyleSheet, View } from "react-native";
import IndoorFloorBottomSheet from "./IndoorFloorBottomSheet";
import IndoorRoomBottomSheet from "./IndoorRoomBottomSheet";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";

export type IndoorBottomSheetSectionProps = {
  floor: Floor | undefined;
  buildingCode: string;
  buildingName: string;
  metroAccessible?: boolean;

  selectedPoiName?: string;
  onClearSelectedPoi: () => void;

  onDirectionsPress?: () => void;
  directionsDisabled?: boolean;
};

export default function IndoorBottomSheetSection(
  props: Readonly<IndoorBottomSheetSectionProps>,
) {
  const nav = useIndoorNavigationStore();

  // ✅ Hide BOTH room + floor bottom sheets while in itinerary
  if (nav.mode === "ITINERARY") return null;

  const {
    floor,
    buildingCode,
    buildingName,
    metroAccessible,
    selectedPoiName,
    onClearSelectedPoi,
    onDirectionsPress,
    directionsDisabled = false,
  } = props;

  const selectedPoi = selectedPoiName
    ? floor?.pois.find((poi) => poi.name === selectedPoiName)
    : undefined;

  return (
    <View style={indoorBottomSheetStyles.bottomSheetContainer}>
      {floor && !selectedPoi && (
        <IndoorFloorBottomSheet
          floor={floor}
          buildingName={buildingName}
          buildingCode={buildingCode}
          metroAccessible={metroAccessible}
        />
      )}

      {selectedPoi && (
        <IndoorRoomBottomSheet
          roomCode={selectedPoi.name}
          buildingCode={buildingCode}
          roomType={selectedPoi.type}
          onClose={onClearSelectedPoi}
          onDirectionsPress={onDirectionsPress}
          directionsDisabled={directionsDisabled}
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