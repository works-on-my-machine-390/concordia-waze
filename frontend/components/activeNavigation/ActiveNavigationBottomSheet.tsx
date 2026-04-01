import { CloseIcon } from "@/app/icons";
import NavigationBottomSheetStyles from "@/app/styles/navigationBottomSheetStyles";
import { formatDuration } from "@/app/utils/stringUtils";
import { Point } from "@/hooks/queries/buildingQueries";
import { DirectionsResponseBlockType } from "@/hooks/queries/navigationQueries";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, usePathname } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import OutdoorNavigationSteps from "../OutdoorNavigationSteps";
import ReturnOutdoorButton from "./ReturnOutdoorButton";

const HandleComponent = () => (
  <View style={NavigationBottomSheetStyles.fakeHandleContainer}>
    <View style={NavigationBottomSheetStyles.fakeHandleBar} />
  </View>
);

export default function ActiveNavigationBottomSheet() {
  const snapPoints = ["15%", "70%"];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const pathname = usePathname();

  const navigationState = useNavigationStore();
  const outdoorDirections =
    navigationState.currentDirections?.directionBlocks.find(
      (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
    )?.directionsByMode?.[navigationState.transitMode];

  const handleCloseSheet = () => {
    navigationState.setNavigationPhase(NavigationPhase.PREPARATION);
    navigationState.setCurrentOutdoorStepIndex(undefined);
    navigationState.setCurrentIndoorStepIndex(undefined);
  };

  const initialDuration =
    navigationState.currentDirections?.durationBlock?.durations[
      navigationState.transitMode
    ];
  const eta =
    navigationState.startDateTime && initialDuration
      ? new Date(
          navigationState.startDateTime.getTime() + initialDuration * 1000,
        )
      : undefined;

  const getCurrentLocationLatLng = (): Point => {
    if (pathname !== "/indoor-map") return null;

    if (navigationState.startLocation.code === params.buildingCode) {
      return {
        latitude: navigationState.startLocation.latitude,
        longitude: navigationState.startLocation.longitude,
      };
    }
    if (navigationState.endLocation?.code === params.buildingCode) {
      return {
        latitude: navigationState.endLocation.latitude,
        longitude: navigationState.endLocation.longitude,
      };
    }
    return null;
  };

  const renderETABlock = () => {
    if (eta) {
      return (
        <View>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Text style={NavigationBottomSheetStyles.transitModeTitle}>
              Arriving at{" "}
              {eta.toLocaleTimeString("en-us", { timeStyle: "short" })}
            </Text>
            <Text style={NavigationBottomSheetStyles.transitModeDuration}>
              ({formatDuration(initialDuration)})
            </Text>
          </View>

          <Text style={NavigationBottomSheetStyles.transitModeDuration}>
            if departing at{" "}
            {navigationState.startDateTime?.toLocaleTimeString("en-us", {
              timeStyle: "short",
            })}
          </Text>
        </View>
      );
    }

    // fallback
    return (
      <View>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Text style={NavigationBottomSheetStyles.transitModeTitle}>
            Route will take ({formatDuration(initialDuration)})
          </Text>
        </View>
      </View>
    );
  };

  // reusing navigationBottomSheetStyles - naming may be off but styles are still relevant
  return (
    <BottomSheet
      handleComponent={HandleComponent}
      index={0}
      snapPoints={snapPoints}
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={NavigationBottomSheetStyles.headerContainer}>
        <View style={NavigationBottomSheetStyles.navModeHeader}>
          {renderETABlock()}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={handleCloseSheet}
              style={NavigationBottomSheetStyles.closeIcon}
              testID="close-navigation"
              accessibilityLabel="Close navigation"
              accessibilityRole="button"
            >
              <CloseIcon size={28} />
            </TouchableOpacity>
          </View>
        </View>
        {pathname === "/indoor-map" && (
          <View style={NavigationBottomSheetStyles.toOutdoorButton}>
            <ReturnOutdoorButton location={getCurrentLocationLatLng()} />
          </View>
        )}
      </View>
      <BottomSheetScrollView
        contentContainerStyle={[
          NavigationBottomSheetStyles.scrollContent,
          { paddingBottom: insets.bottom },
        ]}
      >
        <OutdoorNavigationSteps
          indoorDirectionBlocks={navigationState.currentDirections?.directionBlocks.filter(
            (block) => block.type === DirectionsResponseBlockType.INDOOR,
          )}
          outdoorDirections={outdoorDirections}
          outdoorDirectionSequenceNumber={
            navigationState.currentDirections.directionBlocks.find(
              (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
            )?.sequenceNumber
          }
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
