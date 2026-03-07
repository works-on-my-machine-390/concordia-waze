import BottomSheet from "@gorhom/bottom-sheet";
import {
  estimateDurationMinutes,
  formatArrivalTimeFromNow,
} from "@/app/utils/indoorNavigationSteps";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_SHEET_HEIGHT = 150;

type Props = {
  remainingDistanceMeters: number;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  isLastStep: boolean;
};

export default function IndoorNavigationBottomSheet({
  remainingDistanceMeters,
  currentStepIndex,
  totalSteps,
  onNext,
  isLastStep,
}: Readonly<Props>) {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => [NAV_SHEET_HEIGHT], []);

  const roundedMeters = Math.max(0, Math.round(remainingDistanceMeters));
  const durationMinutes = estimateDurationMinutes(remainingDistanceMeters);
  const arrivalTime = formatArrivalTimeFromNow(remainingDistanceMeters);

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      bottomInset={0}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
    >
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{arrivalTime}</Text>
          <Text style={styles.metricLabel}>arrival</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricValue}>{durationMinutes}</Text>
          <Text style={styles.metricLabel}>min.</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricValue}>{roundedMeters}</Text>
          <Text style={styles.metricLabel}>m</Text>
        </View>

        <Pressable style={styles.nextBtn} onPress={onNext}>
          <Text style={styles.nextText}>{isLastStep ? "FINISH" : "NEXT"}</Text>
        </Pressable>
      </View>

      <Text style={styles.stepCounter}>
        Step {Math.min(currentStepIndex + 1, totalSteps)} of {totalSteps}
      </Text>

      <View style={{ height: Math.max(insets.bottom, 8) }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  handle: {
    paddingTop: 8,
  },
  handleIndicator: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#BDBDBD",
  },
  metricsRow: {
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metric: {
    minWidth: 58,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  metricLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginTop: 2,
  },
  nextBtn: {
    marginLeft: "auto",
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#912338",
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  stepCounter: {
    paddingHorizontal: 18,
    paddingTop: 14,
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
});