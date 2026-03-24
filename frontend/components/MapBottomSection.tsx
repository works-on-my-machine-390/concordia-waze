import { NextClassResponse } from "@/hooks/queries/classQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { StyleSheet, View } from "react-native";
import ActiveNavigationBottomSheet from "./activeNavigation/ActiveNavigationBottomSheet";
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
  nextClass?: NextClassResponse | null;
};

/**
 * Collection of all bottom sheets used on the map page + bottom buttons + next class drawer.
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

  const renderNextClassDrawer = () => {
    return <NextClassDrawer nextClass={props.nextClass ?? null} />;
  };

  const renderSheets = () => {
    return (
      <>
        {state.currentMode === MapMode.POI && (
          <PoiSearchBottomSheet moveCamera={props.moveCamera} />
        )}

        {state.currentMode === MapMode.BUILDING && <BuildingBottomSheet />}

        {state.currentMode === MapMode.NAVIGATION &&
          navigationPhase === NavigationPhase.PREPARATION && (
            <NavigationBottomSheet />
          )}
        {state.currentMode === MapMode.NAVIGATION &&
          navigationPhase === NavigationPhase.ACTIVE && (
            <ActiveNavigationBottomSheet />
          )}

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
