import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import IndoorFloorBottomSheet from "./IndoorFloorBottomSheet";
import IndoorRoomBottomSheet from "./IndoorRoomBottomSheet";
import PoiFilterBottomSheet from "./PoiFilterBottomSheet";

export type IndoorBottomSheetSectionProps = {
  floor: Floor | undefined;
  buildingCode: string;
  buildingName: string;
  metroAccessible?: boolean;
  selectedPoiName?: string;
  onClearSelectedPoi: () => void;
};

/**
 * Collection of all bottom sheets used on the indoor map page.
 */
export default function IndoorBottomSheetSection(
  props: Readonly<IndoorBottomSheetSectionProps>,
) {
  const {
    floor,
    buildingCode,
    buildingName,
    metroAccessible,
    selectedPoiName,
    onClearSelectedPoi,
  } = props;

  const { selectedPoiFilter, clearSelectedPoiFilter } = useIndoorSearchStore();
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
          roomType={selectedPoi.type}
          onClose={onClearSelectedPoi}
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
