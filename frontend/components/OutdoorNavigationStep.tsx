import { stripHtmlTags } from "@/app/utils/stringUtils";
import TransitStepDetails from "@/components/TransitStepDetails";
import { DirectionsModel, StepModel, TransitMode } from "@/hooks/queries/navigationQueries";
import { StyleSheet, Text, View } from "react-native";

export type OutdoorNavigationStepsProps = {
  directions: DirectionsModel;
};

export default function OutdoorNavigationSteps(
  props: Readonly<OutdoorNavigationStepsProps>,
) {
  const renderNoDirectionsMessage = () => {
    return (
      <View style={styles.placeholderStep}>
        <Text style={styles.placeholderText}>No directions available</Text>
      </View>
    );
  };
  return (
    <View>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Steps</Text>
        {!props.directions && renderNoDirectionsMessage()}
        {props.directions && (
          <View>
            {props.directions.steps.map((step: StepModel, index) => {
              return (
                <View key={step.polyline + index} style={styles.stepContainer}>
                  <View
                    style={{
                        maxWidth: "100%",
                      width: "100%",
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={[styles.stepText, { maxWidth: "70%" }]}>
                      {stripHtmlTags(step.instruction)}
                    </Text>

                    <View style={{}}>
                      <Text style={styles.stepText}>{step.duration}</Text>
                      <Text style={styles.stepText}>{step.distance}</Text>
                    </View>
                  </View>
                  {step.travel_mode === TransitMode.TRANSIT && (
                    <TransitStepDetails step={step} />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  stepContainer: {
    backgroundColor: "#e0e0e0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepText: {
    fontSize: 16,
    color: "#333",
  },

  placeholderStep: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
  },
});
