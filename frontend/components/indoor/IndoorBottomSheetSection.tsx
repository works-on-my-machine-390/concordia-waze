import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import IndoorFloorBottomSheet from "./IndoorFloorBottomSheet";
import PoiFilterBottomSheet from "./PoiFilterBottomSheet";
import IndoorRoomBottomSheet from "./IndoorRoomBottomSheet";

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
  const navMode = useIndoorNavigationStore((s) => s.mode);

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

  const selectedPoiFilter = useIndoorSearchStore((s) => s.selectedPoiFilter);
  const clearSelectedPoiFilter = useIndoorSearchStore(
    (s) => s.clearSelectedPoiFilter,
  );

  const { data } = useGetBuildingFloors(buildingCode);
  const floors = data?.floors || [];
  const router = useRouter();

  const selectedPoi = selectedPoiName
    ? floor?.pois.find((poi) => poi.name === selectedPoiName)
    : undefined;

  const handlePoiSelect = (roomCode: string, floorNumber: number) => {
    clearSelectedPoiFilter();
    router.push({
      pathname: "/indoor-map",
      params: {
        buildingCode,
        selectedRoom: roomCode,
        selectedFloor: floorNumber.toString(),
      },
    });
  };

  // ✅ early return only AFTER all hooks
  if (navMode === "ITINERARY") return null;

  return (
    <View style={indoorBottomSheetStyles.bottomSheetContainer}>
      {floor && !selectedPoi && !selectedPoiFilter && (
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
          floorNumber={floor.number}
          coordX={selectedPoi.position.x}
          coordY={selectedPoi.position.y}
          roomType={selectedPoi.type}
          onClose={onClearSelectedPoi}
          onDirectionsPress={onDirectionsPress}
          directionsDisabled={directionsDisabled}
        />
      )}

      {selectedPoiFilter && (
        <PoiFilterBottomSheet
          poiType={selectedPoiFilter.type}
          poiLabel={selectedPoiFilter.label}
          floors={floors}
          buildingCode={buildingCode}
          onPoiSelect={handlePoiSelect}
          onClose={clearSelectedPoiFilter}
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
