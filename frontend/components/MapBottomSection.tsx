import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { useNextClass } from "@/hooks/useNextClass";
import { StyleSheet, View } from "react-native";
import BuildingBottomSheet from "./BuildingBottomSheet";
import NextClassDrawer from "./classes/NextClassDrawer";
import LocationButton from "./LocationButton";
import MapSettingsBottomSheet from "./MapSettingsBottomSheet";
import MapSettingsButton from "./MapSettingsButton";
import NavigationBottomSheet from "./NavigationBottomSheet";
import PoiSearchBottomSheet from "./poi/PoiSearchBottomSheet";

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
  const { nextClass } = useNextClass();

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

  const renderNextClassDrawer = () => {
    if (!nextClass) return null;
    return <NextClassDrawer nextClass={nextClass} />;
  };

  const renderSheets = () => {
    return (
      <>
        {state.currentMode === MapMode.POI && (
          <PoiSearchBottomSheet moveCamera={props.moveCamera} />
        )}

        {state.currentMode === MapMode.BUILDING && <BuildingBottomSheet />}

        {state.currentMode === MapMode.NAVIGATION && <NavigationBottomSheet />}

        {state.currentMode === MapMode.SETTINGS && <MapSettingsBottomSheet />}
      </>
    );
  };

  return (
    <View style={mapBottomSheetStyles.bottomSheetContainer}>
      {renderButtons()}
      {renderNextClassDrawer()}
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
