import { COLORS, DIRECTION_COLORS } from "@/app/constants";
import { CircleIcon } from "@/app/icons";
import { directionStepsStyles } from "@/app/styles/directionStyles";
import {
  DirectionsModel,
  StepModel,
  TransitMode,
  TransitType,
} from "@/hooks/queries/navigationQueries";
import { Text, View } from "react-native";
import TransitTypeIcon from "./TransitTypeIcon";
import WalkingDottedLine from "./WalkingDottedLine";
import { useNavigationStore } from "@/hooks/useNavigationStore";

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
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
      </View>
    );
  };

  const renderTransitStep = (step: StepModel, index: number) => {
    return (
      <View key={step.polyline + index}>
        <View style={directionStepsStyles.checkpointContainer}>
          <View
            style={{
              minWidth: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircleIcon size={16} />
          </View>

          <Text style={directionStepsStyles.checkpointText}>
            {step.departure_stop}
          </Text>
        </View>

        <View style={directionStepsStyles.transitStepContainer}>
          <View style={{ minWidth: 40, alignItems: "center" }}>
            <View
              style={[
                directionStepsStyles.transitStepVerticalLine,
                {
                  backgroundColor:
                    step.transit_line_color || DIRECTION_COLORS.transit,
                },
              ]}
            />
          </View>
          <View
            style={{
              flex: 1,
              height: 100,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {renderDivider()}

            <View
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ height: "100%", justifyContent: "center" }}>
                <View
                  style={{
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={[
                      directionStepsStyles.transitLineChip,
                      {
                        backgroundColor:
                          step.transit_line_color || DIRECTION_COLORS.transit,
                        color:
                          step.transit_line_text_color || COLORS.textPrimary,
                      },
                    ]}
                  >
                    {step.transit_line}
                  </Text>

                  <Text style={directionStepsStyles.stepText}>
                    {step.transit_headsign}
                  </Text>
                </View>
                <Text style={{ color: COLORS.textMuted }}>
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
          <View style={{ minWidth: 40, alignItems: "center" }}>
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
          <View
            style={{
              alignItems: "center",
              width: 40,
              height: 100,
              marginTop: -8,
            }}
          >
            <WalkingDottedLine height={120} />
          </View>

          <View
            style={{
              flex: 1,
              height: 100,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {renderDivider()}
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ maxWidth: "80%" }}>
                <Text
                  style={[directionStepsStyles.stepText, { maxWidth: "100%" }]}
                >
                  {step.instruction}
                </Text>
                <Text style={{ color: COLORS.textMuted }}>
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
        <View style={{ minWidth: 40, alignItems: "center" }}>
          <CircleIcon size={16} />
        </View>
        <Text
          style={[directionStepsStyles.checkpointText, { maxWidth: "80%" }]}
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
        <View style={{ minWidth: 40, alignItems: "center" }}>
          <CircleIcon size={16} />
        </View>
        <Text
          style={[directionStepsStyles.checkpointText, { maxWidth: "80%" }]}
        >
          {endLocation?.name || "Destination"}
        </Text>
      </View>
    </View>
  );
}
