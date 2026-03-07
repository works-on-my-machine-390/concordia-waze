import { COLORS } from "@/app/constants";
import type { IndoorNavigationStep } from "@/app/utils/indoorNavigationSteps";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  step: IndoorNavigationStep | null;
  topOffset: number;
};

export default function IndoorNavigationInstructionCard({
  step,
  topOffset,
}: Readonly<Props>) {
  if (!step) return null;

  const distanceText = `${Math.max(1, Math.round(step.distanceMeters))} m`;

  return (
    <View style={[styles.container, { top: topOffset }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={step.iconName} size={34} color="white" />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.distance}>{distanceText}</Text>
        <Text style={styles.instruction}>{step.instruction}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrap: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    marginLeft: 8,
  },
  distance: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  instruction: {
    color: "#D8D8D8",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
});