import { COLORS } from "@/app/constants";
import { directionStepsStyles } from "@/app/styles/directionStyles";
import { stripHtmlTags } from "@/app/utils/stringUtils";
import {
  OutdoorDirectionsModel,
  StepModel,
  TransitMode,
} from "@/hooks/queries/navigationQueries";
import { Image, Text, View } from "react-native";
import DirectionIcon from "./DirectionIcon";
import OutdoorNavigationTransitSteps from "./OutdoorNavigationTransitSteps";
const concordiaLogo = require("../assets/images/concordia_logo.png");

export type OutdoorNavigationStepsProps = {
  directions: OutdoorDirectionsModel;
};

export default function OutdoorNavigationSteps(
  props: Readonly<OutdoorNavigationStepsProps>,
) {
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

  const renderSteps = () => {
    if (props.directions.mode.toUpperCase() === TransitMode.TRANSIT) {
      return <OutdoorNavigationTransitSteps directions={props.directions} />;
      // transit steps are more complicated to render, so we use a separate component for them.
    }

    return (
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
                  style={{ flex: 1, height: 1, backgroundColor: COLORS.border }}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View>
      <View style={directionStepsStyles.sectionContainer}>
        <Text style={directionStepsStyles.sectionTitle}>Steps</Text>
        {!props.directions && renderNoDirectionsMessage()}
        {props.directions && <View>{renderSteps()}</View>}
      </View>
    </View>
  );
}
