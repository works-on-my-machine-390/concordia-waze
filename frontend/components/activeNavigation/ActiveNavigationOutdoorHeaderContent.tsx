import { COLORS } from "@/app/constants";
import { LoginIcon } from "@/app/icons";
import { activeNavigationHeaderStyles } from "@/app/styles/navigationHeaderStyles";
import { stripHtmlTags } from "@/app/utils/stringUtils";
import { MoveCameraParams, useMapCamera } from "@/contexts/MapCameraContext";
import {
  DirectionsResponseBlockType,
  OutdoorDirectionsBlockModel,
  StepModel,
} from "@/hooks/queries/navigationQueries";
import useMapSettings from "@/hooks/useMapSettings";
import { useMapStore } from "@/hooks/useMapStore";
import {
  getDirectionsSequence,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import DirectionIcon from "../DirectionIcon";
import ActiveNavigationHeaderStepper from "./ActiveNavigationHeaderStepper";

function getTransitInstruction(step: StepModel): string {
  const type = step.transit_type?.toLowerCase();
  const line = step.transit_line;
  const headsign = step.transit_headsign;
  const arrivalStop = step.arrival_stop;

  const lineLabel = line ? ` ${line}` : "";
  const towards = headsign ? ` towards ${headsign}` : "";
  const exit = arrivalStop ? `, exit at ${arrivalStop}` : "";

  if (type === "subway") {
    return `Metro${lineLabel}${towards}${exit}`;
  }
  return `Bus${lineLabel}${towards}${exit}`;
}

export default function ActiveNavigationOutdoorHeaderContent() {
  const router = useRouter();
  const navigationState = useNavigationStore();
  const { moveCamera } = useMapCamera();
  const { mapSettings } = useMapSettings();
  const resetMapState = useMapStore((state) => state.closeSheet);

  if (!navigationState.currentDirections) {
    return null;
  }

  const outdoorDirectionsBlock: OutdoorDirectionsBlockModel =
    navigationState.currentDirections?.directionBlocks.find(
      (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
    );

  const outdoorDirections =
    outdoorDirectionsBlock?.directionsByMode?.[navigationState.transitMode];

  const currentStepIndex = navigationState.currentOutdoorStepIndex;
  const currentStep = outdoorDirections?.steps[currentStepIndex || 0];

  const focusOnStep = (step: StepModel | undefined) => {
    if (!step) return;
    if (!mapSettings.recenterOnStepDuringActiveNavigation) return;

    const isFinalStep =
      step === outdoorDirections?.steps?.[outdoorDirections.steps.length - 1];

    let moveCamParams: MoveCameraParams = {
      latitude: step.start.latitude,
      longitude: step.start.longitude,
      duration: 500,
    };
    if (isFinalStep) {
      moveCamParams = {
        latitude: (step.start.latitude + step.end.latitude) / 2,
        longitude: (step.start.longitude + step.end.longitude) / 2,
        delta: (step.start.latitude - step.end.latitude) * 4, // zoom out to fit both start and end of the final step
        duration: 500,
      };
    }

    moveCamera(moveCamParams);
  };

  const handlePreviousStepPress = () => {
    if (!currentStep || !outdoorDirections || currentStepIndex === 0) return;
    const previousStepIndex = (currentStepIndex || 0) - 1;
    navigationState.setCurrentOutdoorStepIndex(previousStepIndex);
    focusOnStep(outdoorDirections.steps[previousStepIndex]);
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
    const nextStepIndex = (currentStepIndex || 0) + 1;
    navigationState.setCurrentOutdoorStepIndex(nextStepIndex);
    focusOnStep(outdoorDirections?.steps[nextStepIndex]);
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
                {currentStep.transit_type
                  ? getTransitInstruction(currentStep)
                  : stripHtmlTags(currentStep.instruction)}
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
