import { CircleIcon } from "@/app/icons";
import {
  directionStepsStyles,
  getTransitLineChipColorsStyle,
  getTransitStepVerticalLineColorStyle,
} from "@/app/styles/directionStyles";
import {
  DirectionsModel,
  StepModel,
  TransitMode,
  TransitType,
} from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { Text, View } from "react-native";
import TransitTypeIcon from "./TransitTypeIcon";
import WalkingDottedLine from "./WalkingDottedLine";

export type OutdoorNavigationStepsProps = {
  directions: DirectionsModel;
};

export default function OutdoorNavigationTransitSteps(
  props: Readonly<OutdoorNavigationStepsProps>,
) {
  const startLocation = useNavigationStore((state) => state.startLocation);
  const endLocation = useNavigationStore((state) => state.endLocation);

  const renderDivider = () => {
    return (
      <View style={directionStepsStyles.distanceDivider}>
        <View style={directionStepsStyles.dividerLine} />
      </View>
    );
  };

  const renderTransitStep = (step: StepModel, index: number) => {
    return (
      <View key={step.polyline + index}>
        <View style={directionStepsStyles.checkpointContainer}>
          <View style={directionStepsStyles.checkpointIconContainer}>
            <CircleIcon size={16} />
          </View>

          <Text style={directionStepsStyles.checkpointText}>
            {step.departure_stop}
          </Text>
        </View>

        <View style={directionStepsStyles.transitStepContainer}>
          <View style={directionStepsStyles.transitStepVerticalLineContainer}>
            <View
              style={[
                directionStepsStyles.transitStepVerticalLine,
                getTransitStepVerticalLineColorStyle(step.transit_line_color),
              ]}
            />
          </View>
          <View style={directionStepsStyles.transitStepContentContainer}>
            {renderDivider()}

            <View style={directionStepsStyles.transitStepRow}>
              <View style={directionStepsStyles.transitStepMainInfoContainer}>
                <View style={directionStepsStyles.transitStepLineInfoRow}>
                  <Text
                    style={[
                      directionStepsStyles.transitLineChip,
                      getTransitLineChipColorsStyle(
                        step.transit_line_color,
                        step.transit_line_text_color,
                      ),
                    ]}
                  >
                    {step.transit_line}
                  </Text>

                  <Text style={directionStepsStyles.stepText}>
                    {step.transit_headsign}
                  </Text>
                </View>
                <Text style={directionStepsStyles.mutedText}>
                  {step.duration} {`(${step.num_stops} stops)`}
                </Text>
                <Text>Departs at {step.departure_time}</Text>
              </View>
              <TransitTypeIcon
                transitType={step.transit_type as TransitType}
                size={20}
              />
            </View>

            {renderDivider()}
          </View>
        </View>

        <View style={directionStepsStyles.checkpointContainer}>
          <View style={directionStepsStyles.checkpointIconContainer}>
            <CircleIcon size={16} />
          </View>

          <Text style={directionStepsStyles.checkpointText}>
            {step.arrival_stop}
          </Text>
        </View>
      </View>
    );
  };

  const renderWalkingStep = (step: StepModel, index: number) => {
    return (
      <View key={step.polyline + index}>
        <View style={directionStepsStyles.transitStepContainer}>
          <View style={directionStepsStyles.walkingStepLineContainer}>
            <WalkingDottedLine height={120} />
          </View>

          <View style={directionStepsStyles.walkingStepContentContainer}>
            {renderDivider()}
            <View style={directionStepsStyles.walkingStepRow}>
              <View style={directionStepsStyles.walkingStepMainInfoContainer}>
                <Text
                  style={[
                    directionStepsStyles.stepText,
                    directionStepsStyles.walkingStepTextFullWidth,
                  ]}
                >
                  {step.instruction}
                </Text>
                <Text style={directionStepsStyles.mutedText}>
                  {step.duration} ({step.distance})
                </Text>
              </View>
              <TransitTypeIcon transitType={TransitType.WALKING} size={20} />
            </View>
            {renderDivider()}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View>
      <View
        key={"start-checkpoint"}
        style={directionStepsStyles.checkpointContainer}
      >
        <View style={directionStepsStyles.checkpointIconContainer}>
          <CircleIcon size={16} />
        </View>
        <Text
          style={[
            directionStepsStyles.checkpointText,
            directionStepsStyles.checkpointTextWithMaxWidth,
          ]}
        >
          {startLocation?.name || "Start location"}
        </Text>
      </View>

      {props.directions.steps.map((step: StepModel, index) => {
        if (step.travel_mode === TransitMode.TRANSIT) {
          return renderTransitStep(step, index);
        } else {
          return renderWalkingStep(step, index);
        }
      })}

      <View
        key={"end-checkpoint"}
        style={directionStepsStyles.checkpointContainer}
      >
        <View style={directionStepsStyles.checkpointIconContainer}>
          <CircleIcon size={16} />
        </View>
        <Text
          style={[
            directionStepsStyles.checkpointText,
            directionStepsStyles.checkpointTextWithMaxWidth,
          ]}
        >
          {endLocation?.name || "Destination"}
        </Text>
      </View>
    </View>
  );
}
