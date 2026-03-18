import { COLORS } from "@/app/constants";
import { stripHtmlTags } from "@/app/utils/stringUtils";
import { DirectionsResponseBlockType } from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DirectionIcon from "./DirectionIcon";
import { useMapStore } from "@/hooks/useMapStore";
import { BackIcon, ForwardIcon } from "@/app/icons";

// TODO add details
export default function ActiveNavigationHeader() {
  const navigationState = useNavigationStore();
  const resetMapState = useMapStore((state) => state.closeSheet);
  const insets = useSafeAreaInsets();

  const outdoorDirections =
    navigationState.currentDirections?.directionBlocks.find(
      (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
    )?.directionsByMode[navigationState.transitMode];

  const currentStepIndex = navigationState.currentStepIndex;
  const currentStep = outdoorDirections?.steps[currentStepIndex || 0];

  const handlePreviousStepPress = () => {
    if (!currentStep || !outdoorDirections || currentStepIndex === 0) return;
    navigationState.setCurrentStepIndex((currentStepIndex || 0) - 1);
  };

  const handleNextStepPress = () => {
    if (!currentStep || !outdoorDirections) return;
    if (currentStepIndex === outdoorDirections.steps.length - 1) {
      // end of navigation, exit
      navigationState.clearState();
      resetMapState();

      return;
    }
    navigationState.setCurrentStepIndex((currentStepIndex || 0) + 1);
  };

  const isLastStep = currentStepIndex === outdoorDirections?.steps.length - 1;

  const stepperButtonText = isLastStep ? "Finish" : "Next Step";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View
        style={[
          {
            paddingHorizontal: 24,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 16,
          },
        ]}
      >
        <DirectionIcon
          maneuver={currentStep?.maneuver}
          size={64}
          color={COLORS.surface}
        />
        <View style={{ flex: 1 }}>
          {currentStep && (
            <View>
              <Text style={[styles.lightTextColor, styles.distanceText]}>
                {currentStep.distance}
              </Text>

              <Text style={[styles.lightTextColor, styles.instructionText]}>
                {stripHtmlTags(currentStep.instruction)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 24,
          marginBottom: 16,
        }}
      >
        {navigationState.currentStepIndex !== 0 && (
          <TouchableOpacity
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 8,
              backgroundColor: COLORS.bgDark,
              borderRadius: 16,
            }}
            onPress={handlePreviousStepPress}
          >
            <View
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BackIcon size={20} />
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{
            flex: 11,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 8,
            backgroundColor: COLORS.bgDark,
            borderRadius: 16,
            flexDirection: "row",
            gap: 10,
          }}
          onPress={handleNextStepPress}
        >
          <Text style={{ fontSize: 16 }}>{stepperButtonText}</Text>
          {!isLastStep && <ForwardIcon size={20} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    backgroundColor: COLORS.darkBgOverlay,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  lightTextColor: {
    color: COLORS.border,
  },
  instructionText: {
    fontSize: 18,
    lineHeight: 24,
  },
  distanceText: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: 18,
  },
});
