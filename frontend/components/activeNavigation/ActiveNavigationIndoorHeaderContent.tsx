import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";
import { BackIcon, ForwardIcon } from "@/app/icons";
import { activeNavigationHeaderStyles } from "@/app/styles/navigationHeaderStyles";
import {
  buildIndoorNavigationSteps,
  type IndoorNavigationStep,
} from "@/app/utils/indoorNavigationSteps";
import { getSafeStepIndex } from "@/app/utils/pathUtils";
import { getArrivalInstruction } from "@/app/utils/stringUtils";
import { MultiFloorPathResult } from "@/hooks/queries/indoorDirectionsQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { IndoorDirectionsBlockModel } from "@/hooks/queries/navigationQueries";
import { useMapStore } from "@/hooks/useMapStore";
import {
  getDirectionsSequence,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";



export default function ActiveNavigationIndoorHeaderContent() {
  const navigationState = useNavigationStore();
  const resetMapState = useMapStore((state) => state.closeSheet);
  const router = useRouter();
  const [indoorDirectionsSteps, setIndoorDirectionsSteps] = useState<
    IndoorNavigationStep[]
  >([]);

  const params = useLocalSearchParams<IndoorMapPageParams>();
  const floorsQuery = useGetBuildingFloors(params.buildingCode);

  const sequence = getDirectionsSequence(
    navigationState.currentDirections.directionBlocks,
  );

  const isSolelyOutdoors =
    Object.keys(sequence).length === 1 && sequence[0] === "outdoor";

  const getCurrentBlock = (): IndoorDirectionsBlockModel => {
    if (isSolelyOutdoors) return null;

    // this works given that the sequence is composed of at most 3 blocks, with at most 1 outdoor block, and no consecutive indoor blocks.
    if (params.buildingCode === navigationState.startLocation.code) {
      return navigationState.currentDirections.directionBlocks.find(
        (block) => block.type === "indoor" && block.sequenceNumber === 0,
      ) as IndoorDirectionsBlockModel;
    } else if (params.buildingCode === navigationState.endLocation.code) {
      return navigationState.currentDirections.directionBlocks.find(
        (block) => block.type === "indoor" && block.sequenceNumber >= 1,
      ) as IndoorDirectionsBlockModel;
    }

    return null;
  };

  const indoorDirections: MultiFloorPathResult = getCurrentBlock()?.directions;

  const getIndoorNavigationSteps = async () => {
    const segments = indoorDirections?.segments ?? [];
    const floors = floorsQuery.data?.floors ?? [];
    const transitionType = indoorDirections?.transitionType;
    const totalDistance = indoorDirections?.totalDistance;

    return await buildIndoorNavigationSteps({
      segments,
      floors,
      transitionType,
      exactTotalDistanceMeters: totalDistance,
    });
  };

  /**
   * this useEffect runs getIndoorNavigationSteps and updates the setIndoorDirectionsSteps state whenever
   * the indoor directions or the floors data changes.
   * there are a couple of guards to ensure that the UI doesn't crash.
   */
  useEffect(() => {
    if (floorsQuery.isLoading || !indoorDirections || !floorsQuery.data) {
      setIndoorDirectionsSteps([]);
      navigationState.setIndoorNavigationSteps?.([]);
      return;
    }

    void getIndoorNavigationSteps()
      .then((steps) => {
        setIndoorDirectionsSteps(steps);
        navigationState.setIndoorNavigationSteps?.(steps);
      })
      .catch(() => {
        // Keep UI stable if step generation fails while data is updating.
        setIndoorDirectionsSteps([]);
        navigationState.setIndoorNavigationSteps?.([]);
      });
  }, [floorsQuery.isLoading, floorsQuery.data, indoorDirections]);

  // uses getSafeStepIndex because the indoor directions steps are generate asynchronously.
  const currentStepIndex = getSafeStepIndex(
    navigationState.currentIndoorStepIndex,
    indoorDirectionsSteps.length,
  );
  const currentStep = indoorDirectionsSteps[currentStepIndex];

  const renderStepIcon = () => {
    if (!currentStep) return null;
    return <Ionicons name={currentStep.iconName} size={34} color="white" />;
  };

  const renderOutdoorOnlyStep = () => {
    return <></>;
  };

  const isLastStep = currentStepIndex === indoorDirectionsSteps.length - 1;
  const willBeFollowedByOutdoorNavigation =
    sequence[getCurrentBlock()?.sequenceNumber + 1] === "outdoor";
  const isFinalDestination = !willBeFollowedByOutdoorNavigation;

  const handlePreviousStepPress = () => {
    if (currentStepIndex === 0) {
      return;
    }

    // if going back to a step on a different floor, auto-switch the floor view
    const previousStep = indoorDirectionsSteps[currentStepIndex - 1];
    if (previousStep && previousStep.floorNumber !== currentStep?.floorNumber) {
      router.setParams({ selectedFloor: previousStep.floorNumber.toString() });
    }

    navigationState.setCurrentIndoorStepIndex(currentStepIndex - 1);
  };

  const handleMainActionPress = () => {
    if (isLastStep && willBeFollowedByOutdoorNavigation) {
      navigationState.setCurrentIndoorStepIndex(0); // reset indoor step index for the next indoor navigation if there is one
      router.push("/map");
      return;
    }
    if (isLastStep) {
      navigationState.clearState();
      resetMapState();
      return;
    }

    // if current step is a transition (stairs/elevator), auto-switch the floor view
    if (currentStep?.kind === "transition" && !isLastStep) {
      const nextStep = indoorDirectionsSteps[currentStepIndex + 1];
      if (nextStep && nextStep.floorNumber !== currentStep.floorNumber) {
        router.setParams({ selectedFloor: nextStep.floorNumber.toString() });
      }
    }

    navigationState.setCurrentIndoorStepIndex(currentStepIndex + 1);
  };

  const getStepperButtonText = () => {
    if ((isLastStep && willBeFollowedByOutdoorNavigation) || isSolelyOutdoors)
      return "Continue outdoors";

    if (isLastStep) {
      return "Finish";
    }
    return "Next step";
  };
  return (
    <>
      <View style={[activeNavigationHeaderStyles.instructionContainer]}>
        {renderStepIcon()}
        <View style={{ flex: 1 }}>
          {isSolelyOutdoors && renderOutdoorOnlyStep()}
          {!!currentStep && (
            <View>
              <Text
                style={[
                  activeNavigationHeaderStyles.lightTextColor,
                  activeNavigationHeaderStyles.distanceText,
                ]}
              >
                {Math.round(currentStep.distanceMeters)} m
              </Text>

              <Text
                style={[
                  activeNavigationHeaderStyles.lightTextColor,
                  activeNavigationHeaderStyles.instructionText,
                ]}
              >
                {getArrivalInstruction(
                  currentStep,
                  isLastStep,
                  willBeFollowedByOutdoorNavigation,
                  isFinalDestination,
                )}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={[activeNavigationHeaderStyles.stepperContainer]}>
        {currentStepIndex !== 0 && (
          <TouchableOpacity
            style={[activeNavigationHeaderStyles.previousButton]}
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
          style={activeNavigationHeaderStyles.nextButton}
          onPress={handleMainActionPress}
        >
          <Text style={{ fontSize: 16 }}>{getStepperButtonText()}</Text>
          {!isLastStep && <ForwardIcon size={20} />}
        </TouchableOpacity>
      </View>
    </>
  );
}
