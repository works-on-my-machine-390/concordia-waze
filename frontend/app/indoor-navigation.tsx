import { buildIndoorNavigationSteps } from "@/app/utils/indoorNavigationSteps";
import IndoorNavigationBottomSheet from "@/components/indoor/IndoorNavigationBottomSheet";
import IndoorNavigationInstructionCard from "@/components/indoor/IndoorNavigationInstructionCard";
import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import { COLORS } from "@/app/constants";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function IndoorNavigationPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { buildingCode } = useLocalSearchParams<{ buildingCode?: string }>();

  const routeSegments = useIndoorNavigationStore((s) => s.routeSegments);
  const transitionType = useIndoorNavigationStore((s) => s.transitionType);
  const totalDistance = useIndoorNavigationStore((s) => s.totalDistance);
  const start = useIndoorNavigationStore((s) => s.start);
  const currentFloor = useIndoorNavigationStore((s) => s.currentFloor);
  const setCurrentFloor = useIndoorNavigationStore((s) => s.setCurrentFloor);
  const clearRoute = useIndoorNavigationStore((s) => s.clearRoute);
  const exitItinerary = useIndoorNavigationStore((s) => s.exitItinerary);

  const { data } = useGetBuildingFloors(buildingCode ?? "");

  const [steps, setSteps] = useState<Awaited<
    ReturnType<typeof buildIndoorNavigationSteps>
  >>([]);
  const [loadingSteps, setLoadingSteps] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const lastRouteKeyRef = useRef<string>("");

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!data?.floors || !routeSegments || routeSegments.length === 0) {
        if (active) {
          setSteps([]);
          setLoadingSteps(false);
        }
        return;
      }

      setLoadingSteps(true);

      const built = await buildIndoorNavigationSteps({
        segments: routeSegments,
        floors: data.floors,
        transitionType,
        exactTotalDistanceMeters: totalDistance,
      });

      if (!active) return;

      setSteps(built);
      setLoadingSteps(false);

      const routeKey = JSON.stringify({
        segments: routeSegments.map((s) => ({
          floorNumber: s.floorNumber,
          pathLen: s.path.length,
        })),
        transitionType,
        totalDistance,
      });

      if (lastRouteKeyRef.current !== routeKey) {
        lastRouteKeyRef.current = routeKey;
        setCurrentStepIndex(0);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [data?.floors, routeSegments, transitionType, totalDistance]);

  const currentStep = useMemo(
    () => steps[currentStepIndex] ?? null,
    [steps, currentStepIndex],
  );

  useEffect(() => {
    if (!currentStep) return;
    if (currentFloor === currentStep.floorNumber) return;

    setCurrentFloor(currentStep.floorNumber);
  }, [currentStep, currentFloor, setCurrentFloor]);

  const navigationStartOverride = useMemo(() => {
    if (!currentStep || !routeSegments || routeSegments.length === 0) {
      return undefined;
    }

    // Arrival step: keep circle on destination
    if (currentStep.kind === "arrival") {
      return currentStep.targetPoint;
    }

    // First step: keep same positioning as itinerary preview (start room)
    if (currentStepIndex === 0) {
      return undefined;
    }

    const previousStep = steps[currentStepIndex - 1];
    if (!previousStep) return undefined;

    // Same floor: current position is where previous step ended
    if (previousStep.floorNumber === currentStep.floorNumber) {
      return previousStep.targetPoint;
    }

    // Floor changed: current position should be start of the new floor segment
    const currentSegment = routeSegments.find(
      (seg) => seg.floorNumber === currentStep.floorNumber,
    );

    return currentSegment?.path?.[0];
  }, [currentStep, currentStepIndex, routeSegments, steps]);

  const cleanupAndReturnToBrowse = () => {
    clearRoute();
    exitItinerary();
    setCurrentFloor(null);

    router.replace({
      pathname: "/(drawer)/indoor-map",
      params: { buildingCode },
    });
  };

  const handleBack = () => {
    cleanupAndReturnToBrowse();
  };

  const handleNext = () => {
    if (steps.length === 0) return;

    if (currentStepIndex >= steps.length - 1) {
      cleanupAndReturnToBrowse();
      return;
    }

    setCurrentStepIndex((prev) => prev + 1);
  };

  if (loadingSteps) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <IndoorMapContainer
        buildingCode={buildingCode ?? ""}
        routeSegments={routeSegments}
        preferredFloorNumber={currentStep?.floorNumber ?? start?.floor ?? null}
        disablePoiSelection={true}
        hideBottomSheetSection={true}
        hideFloorSelector={true}
        navigationStartOverride={navigationStartOverride}
        navigationPathColor={COLORS.maroon}
        navigationStepIndex={currentStepIndex}
      />

      <Pressable
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={handleBack}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
      </Pressable>

      <IndoorNavigationInstructionCard
        step={currentStep}
        topOffset={insets.top + 64}
      />

      {currentStep ? (
        <IndoorNavigationBottomSheet
          remainingDistanceMeters={currentStep.remainingDistanceMeters}
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          onNext={handleNext}
          isLastStep={currentStepIndex === steps.length - 1}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
});