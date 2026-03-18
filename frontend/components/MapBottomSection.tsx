import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { StyleSheet, View } from "react-native";
import BuildingBottomSheet from "./BuildingBottomSheet";
import LocationButton from "./LocationButton";
import MapSettingsBottomSheet from "./MapSettingsBottomSheet";
import MapSettingsButton from "./MapSettingsButton";
import NavigationBottomSheet from "./NavigationBottomSheet";
import PoiSearchBottomSheet from "./poi/PoiSearchBottomSheet";
import { NavigationPhase, useNavigationStore } from "@/hooks/useNavigationStore";
import ActiveNavigationBottomSheet from "./ActiveNavigationBottomSheet";

export type MapBottomSectionProps = {
  goToMyLocation: () => void;
  moveCamera?: (params: { latitude: number; longitude: number }) => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
};

/**
 * Collection of all bottom sheets used on the map page + bottom buttons.
 */
export default function MapBottomSection(
  props: Readonly<MapBottomSectionProps>,
) {
  const state = useMapStore();
  const navigationPhase = useNavigationStore((state) => state.navigationPhase);

  const renderButtons = () => {
    return (
      <>
        <MapSettingsButton
          onPress={() =>
            state.setCurrentMode(
              state.currentMode === MapMode.SETTINGS
                ? MapMode.NONE
                : MapMode.SETTINGS,
            )
          }
        />

        <LocationButton onPress={props.goToMyLocation} />
      </>
    );
  };

  const renderSheets = () => {
    return (
      <>
        {state.currentMode === MapMode.POI && (
          <PoiSearchBottomSheet moveCamera={props.moveCamera} />
        )}

        {state.currentMode === MapMode.BUILDING && <BuildingBottomSheet />}

        {state.currentMode === MapMode.NAVIGATION && navigationPhase === NavigationPhase.PREPARATION && <NavigationBottomSheet />}
        {state.currentMode === MapMode.NAVIGATION && navigationPhase === NavigationPhase.ACTIVE && <ActiveNavigationBottomSheet />}

        {state.currentMode === MapMode.SETTINGS && <MapSettingsBottomSheet />}
      </>
    );
  };

  return (
    <View style={mapBottomSheetStyles.bottomSheetContainer}>
      {renderButtons()}
      {renderSheets()}
    </View>
  );
}

const mapBottomSheetStyles = StyleSheet.create({
  bottomSheetContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
