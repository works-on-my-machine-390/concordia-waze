import { StepModel } from "@/hooks/queries/navigationQueries";
import { StyleSheet, Text, View } from "react-native";

type TransitStepDetailsProps = {
	step: StepModel;
};

export default function TransitStepDetails(
	props: Readonly<TransitStepDetailsProps>,
) {
	const transitType = props.step.transit_type;
	const line = props.step.transit_line;
	const headsign = props.step.transit_headsign;
  const numberOfStops = props.step.num_stops;
  const departureStop = props.step.departure_stop;
  const arrivalStop = props.step.arrival_stop;

	let modeLabel: "Bus" | "Metro" | null = null;
	if (transitType === "BUS") {
		modeLabel = "Bus";
	}
	if (transitType === "SUBWAY") {
		modeLabel = "Metro";
	}

  if (!modeLabel) {
    return null;
  }

	if (!line && !headsign && !numberOfStops && !departureStop && !arrivalStop) {
		return null;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.text}>{line ? `${modeLabel} ${line}` : modeLabel}</Text>
			{headsign ? <Text style={styles.text}>Direction: {headsign}</Text> : null}
			{numberOfStops ? <Text style={styles.text}>Stops: {numberOfStops}</Text> : null}
			{departureStop ? <Text style={styles.text}>From: {departureStop}</Text> : null}
			{arrivalStop ? <Text style={styles.text}>To: {arrivalStop}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: 6,
	},
	text: {
		fontSize: 14,
		color: "#444",
	},
});