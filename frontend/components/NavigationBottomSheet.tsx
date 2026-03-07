import { getIsCrossCampus } from "@/app/utils/mapUtils";
import {
  TransitMode,
  useGetAllModesDirections,
} from "@/hooks/queries/navigationQueries";
import { useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../app/constants";
import {
  BikeIcon,
  CarIcon,
  CloseIcon,
  TrainIcon,
  WalkingIcon,
} from "../app/icons";
import OutdoorNavigationSteps from "./OutdoorNavigationSteps";

const concordiaLogo = require("../assets/images/concordia_logo.png");

export type NavigationBottomSheetProps = {};

const normalizeMode = (mode?: string) => (mode ?? "").toUpperCase();

export default function NavigationBottomSheet(
  props: Readonly<NavigationBottomSheetProps>,
) {
  const insets = useSafeAreaInsets();

  const navigationState = useNavigationStore();
  const closeSheet = useMapStore((state) => state.closeSheet);

  const queries = useGetAllModesDirections(
    navigationState.startLocation,
    navigationState.endLocation,
    new Date(),
  );

  const directionsData = useMemo(
    () => queries.map((query) => query.data).filter(Boolean),
    [queries],
  );

  const isCrossCampus = useMemo(() => {
    if (!navigationState.startLocation || !navigationState.endLocation) {
      return false;
    }

    return getIsCrossCampus(
      navigationState.startLocation,
      navigationState.endLocation,
    );
  }, [navigationState.startLocation, navigationState.endLocation]);

  const getDurationForMode = (mode: TransitMode) => {
    return (
      directionsData.find(
        (data) => normalizeMode(data?.mode) === normalizeMode(mode),
      )?.duration ?? ""
    );
  };

  const transitOptions = useMemo(() => {
    const baseOptions = [
      {
        mode: TransitMode.DRIVING,
        Icon: CarIcon,
        label: "Drive",
        duration: getDurationForMode(TransitMode.DRIVING),
      },
      {
        mode: TransitMode.TRANSIT,
        Icon: TrainIcon,
        label: "Transit",
        duration: getDurationForMode(TransitMode.TRANSIT),
      },
      {
        mode: TransitMode.WALKING,
        Icon: WalkingIcon,
        label: "Walk",
        duration: getDurationForMode(TransitMode.WALKING),
      },
      {
        mode: TransitMode.BICYCLING,
        Icon: BikeIcon,
        label: "Bike",
        duration: getDurationForMode(TransitMode.BICYCLING),
      },
      {
        mode: TransitMode.SHUTTLE,
        image: concordiaLogo,
        label: "Shuttle",
        duration: getDurationForMode(TransitMode.SHUTTLE),
      },
    ];

    if (isCrossCampus) {
      const shuttleOption = baseOptions.find(
        (option) => option.mode === TransitMode.SHUTTLE,
      );
      const otherOptions = baseOptions.filter(
        (option) => option.mode !== TransitMode.SHUTTLE,
      );
      return shuttleOption ? [shuttleOption, ...otherOptions] : baseOptions;
    }

    return baseOptions;
  }, [isCrossCampus, directionsData]);

  useEffect(() => {
    const hasSelectedMode = transitOptions.some(
      (option) => option.mode === navigationState.transitMode,
    );

    if (transitOptions.length > 0 && !hasSelectedMode) {
      navigationState.setTransitMode(transitOptions[0].mode);
    }
  }, [navigationState.transitMode, transitOptions]);

  const selectedOption =
    transitOptions.find(
      (option) => option.mode === navigationState.transitMode,
    ) || transitOptions[0];

  const snapPoints = useMemo(() => {
    if (!navigationState.startLocation) return ["14%", "70%"];
    return ["20%", "70%"];
  }, [navigationState.startLocation]);

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={NavigationBottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={NavigationBottomSheetStyles.rootContent}>
        <View style={NavigationBottomSheetStyles.fakeHandleContainer}>
          <View style={NavigationBottomSheetStyles.fakeHandleBar} />
        </View>

        <View style={NavigationBottomSheetStyles.headerContainer}>
          <View style={NavigationBottomSheetStyles.navModeHeader}>
            <View>
              <Text style={NavigationBottomSheetStyles.transitModeTitle}>
                {navigationState.startLocation
                  ? selectedOption?.label ?? "Navigation"
                  : "Please select a start location"}
              </Text>

              {!!navigationState.currentDirections &&
                !!selectedOption?.duration && (
                  <Text style={NavigationBottomSheetStyles.transitModeDuration}>
                    {selectedOption.duration}
                  </Text>
                )}
            </View>

            <TouchableOpacity
              onPress={closeSheet}
              style={NavigationBottomSheetStyles.closeIcon}
              testID="close-navigation"
              accessibilityLabel="Close navigation"
              accessibilityRole="button"
            >
              <CloseIcon size={28} />
            </TouchableOpacity>
          </View>

          {!!navigationState.startLocation && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ overflow: "visible" }}
              contentContainerStyle={NavigationBottomSheetStyles.transitRow}
              nestedScrollEnabled={true}
            >
              {transitOptions.map(({ mode, Icon, image, duration }) => {
                const selected = navigationState.transitMode === mode;
                const disabled = mode === TransitMode.SHUTTLE && !isCrossCampus;

                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      NavigationBottomSheetStyles.transitChip,
                      selected &&
                        NavigationBottomSheetStyles.transitChipSelected,
                      disabled &&
                        NavigationBottomSheetStyles.transitChipDisabled,
                    ]}
                    onPress={() =>
                      !disabled && navigationState.setTransitMode(mode)
                    }
                    disabled={disabled}
                  >
                    {Icon ? (
                      <Icon
                        size={18}
                        color={selected ? "#fff" : COLORS.textPrimary}
                      />
                    ) : (
                      <View style={disabled ? { opacity: 0.5 } : {}}>
                        <Image
                          source={image}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      </View>
                    )}

                    {!!duration && (
                      <Text
                        style={[
                          NavigationBottomSheetStyles.transitChipText,
                          selected &&
                            NavigationBottomSheetStyles.transitChipTextSelected,
                          disabled &&
                            NavigationBottomSheetStyles.transitChipTextDisabled,
                        ]}
                      >
                        {duration}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <BottomSheetScrollView
          style={NavigationBottomSheetStyles.stepsScrollView}
          contentContainerStyle={[
            NavigationBottomSheetStyles.scrollContent,
            { paddingBottom: insets.bottom },
          ]}
          nestedScrollEnabled
        >
          {!!navigationState.currentDirections && (
            <OutdoorNavigationSteps
              directions={navigationState.currentDirections}
            />
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
}

const NavigationBottomSheetStyles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: COLORS.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },

  fakeHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
    paddingTop: 8,
  },

  fakeHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D1D6",
    borderRadius: 2,
  },

  rootContent: {
    flex: 1,
  },

  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  stepsScrollView: {
    flex: 1,
  },

  navModeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  transitModeTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  transitModeDuration: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  transitRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingBottom: 4,
    overflow: "visible",
    minHeight: 40,
  },

  transitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },

  transitChipSelected: {
    backgroundColor: COLORS.maroon,
  },

  transitChipDisabled: {
    backgroundColor: "#e0e0e0",
  },

  transitChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  transitChipTextSelected: {
    color: "#fff",
  },

  transitChipTextDisabled: {
    color: "#a0a0a0",
  },

  closeIcon: {
    marginLeft: 7,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },

  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },

  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});