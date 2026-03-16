import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import IndoorFloorBottomSheet from "./IndoorFloorBottomSheet";
import PoiFilterBottomSheet from "./PoiFilterBottomSheet";
import IndoorRoomBottomSheet from "./IndoorRoomBottomSheet";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import NavigationBottomSheet from "../NavigationBottomSheet";
import { MapMode, useMapStore } from "@/hooks/useMapStore";

export type IndoorBottomSheetSectionProps = {
  floor: Floor | undefined;
  buildingCode: string;
  buildingName: string;
  metroAccessible?: boolean;

  selectedPoiName?: string;
  onClearSelectedPoi: () => void;
};

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

  const navigationState = useNavigationStore();
  const currentMapMode = useMapStore((s) => s.currentMode);

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

  return (
    <View style={indoorBottomSheetStyles.bottomSheetContainer}>
      {floor &&
        !selectedPoi &&
        !selectedPoiFilter &&
        currentMapMode !== MapMode.NAVIGATION && (
          <IndoorFloorBottomSheet
            floor={floor}
            buildingName={buildingName}
            buildingCode={buildingCode}
            metroAccessible={metroAccessible}
          />
        )}

      {selectedPoi && currentMapMode !== MapMode.NAVIGATION && (
        // room and POI bottom sheet
        <IndoorRoomBottomSheet
          selectedPoi={selectedPoi}
          onClose={onClearSelectedPoi}
        />
      )}

      {selectedPoiFilter && currentMapMode !== MapMode.NAVIGATION && (
        <PoiFilterBottomSheet
          poiType={selectedPoiFilter.type}
          poiLabel={selectedPoiFilter.label}
          floors={floors}
          buildingCode={buildingCode}
          onPoiSelect={handlePoiSelect}
          onClose={clearSelectedPoiFilter}
        />
      )}

      {navigationState.navigationPhase === NavigationPhase.PREPARATION && (
        <NavigationBottomSheet />
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
