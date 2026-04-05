import { NextClassResponse } from "@/hooks/queries/classQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
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

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function MapBottomSection(
  props: Readonly<MapBottomSectionProps>,
) {
  const state = useMapStore();
  const navigationPhase = useNavigationStore((state) => state.navigationPhase);

  const [currentSheetIndex, setCurrentSheetIndex] = useState<number | null>(
    null,
  );

  // Reset sheet index when mode changes
  useEffect(() => {
    if (state.currentMode === MapMode.NONE) {
      setCurrentSheetIndex(null);
    } else {
      setCurrentSheetIndex(0);
    }
  }, [state.currentMode]);

  const handleSheetIndexChange = (index: number) => {
    setCurrentSheetIndex(index);
  };

  const isNoSheetOpen = state.currentMode === MapMode.NONE;

  const isLargeSheetOpen =
    !isNoSheetOpen && currentSheetIndex !== null && currentSheetIndex >= 1;

  const floatingButtonsBottom = useMemo(() => {
    if (isNoSheetOpen) {
      return 0;
    }

    // Small snap point (20%) then move buttons just above the sheet
    if (currentSheetIndex === 0) {
      const smallSheetHeight = SCREEN_HEIGHT * 0.2;
      return smallSheetHeight;
    }

    // Fallback for any other non-large state
    return 0;
  }, [isNoSheetOpen, currentSheetIndex]);

  const renderNextClassDrawer = () => {
    const bottomSheetVisible = state.currentMode !== MapMode.NONE;
    const navigationActive = navigationPhase !== undefined;
    if (bottomSheetVisible || navigationActive) return null;
    return <NextClassDrawer nextClass={props.nextClass ?? null} />;
  };

  const renderSheets = () => {
    return (
      <>
        {state.currentMode === MapMode.POI && (
          <PoiSearchBottomSheet
            moveCamera={props.moveCamera}
            onSheetIndexChange={handleSheetIndexChange}
          />
        )}

        {state.currentMode === MapMode.BUILDING && (
          <BuildingBottomSheet onSheetIndexChange={handleSheetIndexChange} />
        )}

        {state.currentMode === MapMode.NAVIGATION &&
          navigationPhase === NavigationPhase.PREPARATION && (
            <NavigationBottomSheet
              onSheetIndexChange={handleSheetIndexChange}
            />
          )}

        {state.currentMode === MapMode.NAVIGATION &&
          navigationPhase === NavigationPhase.ACTIVE && (
            <ActiveNavigationBottomSheet
              onSheetIndexChange={handleSheetIndexChange}
            />
          )}

        {state.currentMode === MapMode.SETTINGS && (
          <MapSettingsBottomSheet onSheetIndexChange={handleSheetIndexChange} />
        )}
      </>
    );
  };

  return (
    <View
      style={mapBottomSheetStyles.bottomSheetContainer}
      pointerEvents="box-none"
    >
      {renderNextClassDrawer()}
      {renderSheets()}

      {!isLargeSheetOpen && (
        <View
          testID="floating-buttons-container"
          pointerEvents="box-none"
          style={[
            mapBottomSheetStyles.floatingButtonsContainer,
            { bottom: floatingButtonsBottom },
          ]}
        >
          <View style={mapBottomSheetStyles.buttonsWrapper}>
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
          </View>
        </View>
      )}
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

  floatingButtonsContainer: {
    position: "absolute",
    right: 16,
    zIndex: 1000,
    elevation: 1000,
  },

  buttonsWrapper: {
    gap: 12,
    alignItems: "center",
  },
});
