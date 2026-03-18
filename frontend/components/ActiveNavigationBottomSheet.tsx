import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text, TouchableOpacity, View } from "react-native";
import { BottomSheetStyles } from "./BuildingBottomSheet";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import OutdoorNavigationSteps from "./OutdoorNavigationSteps";
import { DirectionsResponseBlockType } from "@/hooks/queries/navigationQueries";
import NavigationBottomSheetStyles from "@/app/styles/navigationBottomSheetStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseIcon } from "@/app/icons";

export default function ActiveNavigationBottomSheet() {
  const snapPoints = ["15%", "70%"];
  const insets = useSafeAreaInsets();

  const navigationState = useNavigationStore();
  const outdoorDirections =
    navigationState.currentDirections?.directionBlocks.find(
      (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
    ).directionsByMode[navigationState.transitMode];

  const handleCloseSheet = () => {
    navigationState.setNavigationPhase(NavigationPhase.PREPARATION);
  };

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={NavigationBottomSheetStyles.rootContent}>
        <View style={NavigationBottomSheetStyles.fakeHandleContainer}>
          <View style={NavigationBottomSheetStyles.fakeHandleBar} />
        </View>
        <View style={NavigationBottomSheetStyles.headerContainer}>
          <View style={NavigationBottomSheetStyles.navModeHeader}>
            <View>
              <Text style={NavigationBottomSheetStyles.transitModeTitle}>
                TRANSIT MODE
              </Text>
            </View>
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
        </View>
        <BottomSheetScrollView
          style={NavigationBottomSheetStyles.stepsScrollView}
          contentContainerStyle={[
            NavigationBottomSheetStyles.scrollContent,
            { paddingBottom: insets.bottom },
          ]}
          nestedScrollEnabled
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
      </View>
    </BottomSheet>
  );
}
