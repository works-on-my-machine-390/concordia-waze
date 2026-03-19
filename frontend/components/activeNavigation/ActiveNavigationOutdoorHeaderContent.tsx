import { COLORS } from "@/app/constants";
import { LoginIcon } from "@/app/icons";
import { activeNavigationHeaderStyles } from "@/app/styles/navigationHeaderStyles";
import { stripHtmlTags } from "@/app/utils/stringUtils";
import {
  DirectionsResponseBlockType,
  OutdoorDirectionsBlockModel,
} from "@/hooks/queries/navigationQueries";
import { useMapStore } from "@/hooks/useMapStore";
import {
  getDirectionsSequence,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import DirectionIcon from "../DirectionIcon";
import ActiveNavigationHeaderStepper from "./ActiveNavigationHeaderStepper";

export default function ActiveNavigationOutdoorHeaderContent() {
  const router = useRouter();
  const navigationState = useNavigationStore();
  const resetMapState = useMapStore((state) => state.closeSheet);

  const outdoorDirectionsBlock: OutdoorDirectionsBlockModel =
    navigationState.currentDirections?.directionBlocks.find(
      (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
    );

  const outdoorDirections =
    outdoorDirectionsBlock?.directionsByMode?.[navigationState.transitMode];

  const currentStepIndex = navigationState.currentOutdoorStepIndex;
  const currentStep = outdoorDirections?.steps[currentStepIndex || 0];

  const handlePreviousStepPress = () => {
    if (!currentStep || !outdoorDirections || currentStepIndex === 0) return;
    navigationState.setCurrentOutdoorStepIndex((currentStepIndex || 0) - 1);
  };

  const isLastStep = currentStepIndex === outdoorDirections?.steps?.length - 1;
  const sequence = getDirectionsSequence(
    navigationState.currentDirections?.directionBlocks,
  );

  const isSolelyIndoors =
    Object.keys(sequence).length === 1 && sequence[0] === "indoor";

  const willBeFollowedByIndoorNavigation =
    sequence[outdoorDirectionsBlock?.sequenceNumber + 1] === "indoor";

  // used for going to the next step, ending navigation, or going to the indoor map if the next/only step is indoors
  const handleMainActionPress = () => {
    if (isSolelyIndoors) {
      router.push({
        pathname: "/indoor-map",
        params: {
          buildingCode: navigationState.endLocation?.code,
          selectedPoiName: navigationState.endLocation?.name,
        },
      });
      return;
    }

    if (isLastStep) {
      if (willBeFollowedByIndoorNavigation) {
        router.push({
          pathname: "/indoor-map",
          params: {
            buildingCode: navigationState.endLocation?.code,
            selectedPoiName: navigationState.endLocation?.name,
            // don't pass selected floor to show the ground floor
          },
        });
        return;
      }

      // end of navigation, exit
      navigationState.clearState();
      resetMapState();

      return;
    }
    navigationState.setCurrentOutdoorStepIndex((currentStepIndex || 0) + 1);
  };

  const getStepperButtonText = () => {
    if ((isLastStep && willBeFollowedByIndoorNavigation) || isSolelyIndoors)
      return "Continue indoors";

    if (isLastStep) {
      return "Finish";
    }
    return "Next step";
  };

  const renderIndoorOnlyStep = () => {
    return (
      <View>
        <Text
          style={[
            activeNavigationHeaderStyles.lightTextColor,
            activeNavigationHeaderStyles.instructionText,
          ]}
        >
          Proceed to the indoor map for step-by-step directions to your
          destination
        </Text>
      </View>
    );
  };
  const renderStepIcon = () => {
    if (isSolelyIndoors) {
      return <LoginIcon size={64} color={COLORS.surface} />;
    }

    return (
      <DirectionIcon
        maneuver={currentStep?.maneuver}
        size={64}
        color={COLORS.surface}
      />
    );
  };

  return (
    <>
      <View style={[activeNavigationHeaderStyles.instructionContainer]}>
        {renderStepIcon()}
        <View style={{ flex: 1 }}>
          {isSolelyIndoors && renderIndoorOnlyStep()}
          {currentStep && (
            <View>
              <Text
                style={[
                  activeNavigationHeaderStyles.lightTextColor,
                  activeNavigationHeaderStyles.distanceText,
                ]}
              >
                {currentStep.distance}
              </Text>

              <Text
                style={[
                  activeNavigationHeaderStyles.lightTextColor,
                  activeNavigationHeaderStyles.instructionText,
                ]}
              >
                {stripHtmlTags(currentStep.instruction)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <ActiveNavigationHeaderStepper
        currentStepIndex={currentStepIndex || 0}
        totalSteps={outdoorDirections?.steps.length || 0}
        onPreviousStep={handlePreviousStepPress}
        mainActionPress={handleMainActionPress}
        mainActionText={getStepperButtonText}
      />
    </>
  );
}
