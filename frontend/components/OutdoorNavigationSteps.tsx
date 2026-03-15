import { COLORS } from "@/app/constants";
import { directionStepsStyles } from "@/app/styles/directionStyles";
import { stripHtmlTags } from "@/app/utils/stringUtils";
import {
  IndoorDirectionsBlockModel,
  OutdoorDirectionsModel,
  StepModel,
  TransitMode,
} from "@/hooks/queries/navigationQueries";
import { Image, Pressable, Text, View } from "react-native";
import DirectionIcon from "./DirectionIcon";
import OutdoorNavigationTransitSteps from "./OutdoorNavigationTransitSteps";
import { MultiFloorPathResult } from "@/hooks/queries/indoorDirectionsQueries";
const concordiaLogo = require("../assets/images/concordia_logo.png");
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigationStore } from "@/hooks/useNavigationStore";

export type OutdoorNavigationStepsProps = {
  indoorDirectionBlocks?: IndoorDirectionsBlockModel[];
  directions: OutdoorDirectionsModel;
  outdoorDirectionSequenceNumber?: number;
};

export default function OutdoorNavigationSteps(
  props: Readonly<OutdoorNavigationStepsProps>,
) {
  const startLocation = useNavigationStore((state) => state.startLocation);
  const endLocation = useNavigationStore((state) => state.endLocation);

  const renderNoDirectionsMessage = () => {
    return (
      <View style={directionStepsStyles.placeholderStep}>
        <Text style={directionStepsStyles.placeholderText}>
          No directions available
        </Text>
      </View>
    );
  };

  const renderStepIcon = (step: StepModel) => {
    if (step.travel_mode === "Shuttle") {
      // it's sentence cased for whatever reason in the API response
      return (
        <Image
          source={concordiaLogo}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
      );
    }

    return (
      <DirectionIcon
        maneuver={step.maneuver}
        size={32}
        color={COLORS.textPrimary}
      />
    );
  };

  const renderIndoorStep = (
    sequence: "enter" | "exit" | "only_indoor",
    locationName?: string,
  ) => {
    const iconName = () => {
      switch (sequence) {
        case "enter":
          return "enter-outline";
        case "exit":
          return "exit-outline";
        case "only_indoor":
          return "walk";
      }
    };

    const text = () => {
      switch (sequence) {
        case "enter":
          return `Enter the building and navigate to ${locationName}`;
        case "exit":
          return `Exit the building`;
        case "only_indoor":
          return `Navigate within the building to reach your destination`;
      }
    };

    return (
      <View style={directionStepsStyles.indoorStepContainer}>
        <Ionicons name={iconName()} size={24} color="black" />
        <Text style={[directionStepsStyles.stepText, { maxWidth: "65%",marginLeft: 4 }]}>
          {text()}
        </Text>
        <Pressable
          style={{
            marginLeft: "auto",
            flexDirection: "row",
          }}
          onPress={() => {}}
        >
          <Text style={{ color: COLORS.conuRed }}>View map</Text>
        </Pressable>
      </View>
    );
  };

  const renderSteps = () => {
    if (props.directions.mode === TransitMode.transit) {
      return <OutdoorNavigationTransitSteps directions={props.directions} />;
      // transit steps are more complicated to render, so we use a separate component for them.
    }

    const isAnIndoorToOutdoorTransitionPresent =
      props.indoorDirectionBlocks &&
      props.directions &&
      props.indoorDirectionBlocks.length > 0;

    const shouldRenderStartIndoorStep =
      isAnIndoorToOutdoorTransitionPresent &&
      props.indoorDirectionBlocks[0].sequenceNumber === 0;
    const shouldRenderEndIndoorStep =
      isAnIndoorToOutdoorTransitionPresent &&
      props.indoorDirectionBlocks.at(-1)?.sequenceNumber! >
        props.outdoorDirectionSequenceNumber;
    const shouldRenderOnlyIndoorStep =
      props.indoorDirectionBlocks?.length === 1 && !props.directions;

    return (
      <>
        {shouldRenderStartIndoorStep && renderIndoorStep("exit")}
        <View>
          {props.directions.steps.map((step: StepModel, index) => (
            <View
              key={step.polyline + index}
              style={directionStepsStyles.stepContainer}
            >
              <View style={{ minWidth: 40, alignItems: "center" }}>
                {renderStepIcon(step)}
              </View>
              <View>
                <Text
                  style={[directionStepsStyles.stepText, { paddingBottom: 8 }]}
                >
                  {stripHtmlTags(step.instruction)}
                </Text>
                <View style={directionStepsStyles.distanceDivider}>
                  <Text style={directionStepsStyles.distanceText}>
                    {step.distance}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: COLORS.border,
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
        {shouldRenderEndIndoorStep &&
          renderIndoorStep("enter", endLocation?.name)}

        {shouldRenderOnlyIndoorStep &&
          renderIndoorStep("only_indoor", endLocation?.name)}
      </>
    );
  };

  return (
    <View>
      <View style={directionStepsStyles.sectionContainer}>
        <Text style={directionStepsStyles.sectionTitle}>Steps</Text>
        {!props.directions &&
          !props.indoorDirectionBlocks &&
          renderNoDirectionsMessage()}
        {props.directions && <View>{renderSteps()}</View>}
      </View>
    </View>
  );
}
