import NavigationBottomSheetStyles from "@/app/styles/navigationBottomSheetStyles";
import { getIsCrossCampus } from "@/app/utils/mapUtils";
import { formatDuration } from "@/app/utils/stringUtils";
import {
  DirectionsResponseBlockType,
  TransitMode,
  useGetDirections,
} from "@/hooks/queries/navigationQueries";
import useMapSettings, { MapSettings } from "@/hooks/useMapSettings";
import { useMapStore } from "@/hooks/useMapStore";
import {
  OutdoorNavigableLocation,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import AccessibilityToggle from "./indoor/AccessibilityToggle";
import OutdoorNavigationSteps from "./OutdoorNavigationSteps";
import StartNavigationButton from "./StartNavigationButton";

const concordiaLogo = require("../assets/images/concordia_logo.png");

export type NavigationBottomSheetProps = {
  onSheetIndexChange?: (index: number) => void;
};

export default function NavigationBottomSheet(
  props: Readonly<NavigationBottomSheetProps>,
) {
  const { mapSettings, updateSetting } = useMapSettings();
  const navigationState = useNavigationStore();

  const insets = useSafeAreaInsets();

  const query = useGetDirections(
    navigationState.startLocation,
    navigationState.endLocation,
    new Date(),
    mapSettings.preferAccessibleRoutes,
  );

  const isLoading = query.isLoading || query.isRefetching;
  const isError = query.isError;

  const handleSheetChanges = useCallback((index: number) => {
    props.onSheetIndexChange?.(index);
  }, [props.onSheetIndexChange]);

  const handleSheetAnimate = useCallback(
    (_fromIndex: number, toIndex: number) => {
      props.onSheetIndexChange?.(toIndex);
    },
    [props.onSheetIndexChange],
  );

  useEffect(() => {
    if (query.data) {
      navigationState.setCurrentDirections(query.data);
    }
  }, [query.data]);

  const durationsByMode = query.data?.durationBlock?.durations;
  const outdoorBlock = query.data?.directionBlocks.find(
    (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
  );

  const closeSheet = useMapStore((state) => state.closeSheet);

  const handleCloseSheet = () => {
    navigationState.clearState();
    closeSheet();
  };
  const handleToggleAccessibility = () => {
    updateSetting(
      MapSettings.preferAccessibleRoutes,
      !mapSettings.preferAccessibleRoutes,
    );
  };

  const isCrossCampus = useMemo(() => {
    if (!navigationState.startLocation || !navigationState.endLocation)
      return false;
    return getIsCrossCampus(
      navigationState.startLocation as OutdoorNavigableLocation,
      navigationState.endLocation as OutdoorNavigableLocation,
    );
  }, [navigationState.startLocation, navigationState.endLocation]);

  const transitOptions = useMemo(() => {
    const baseOptions = [
      {
        mode: TransitMode.driving,
        Icon: CarIcon,
        label: "Drive",
        duration: formatDuration(durationsByMode?.[TransitMode.driving]) || "",
        disabled: !durationsByMode?.[TransitMode.driving.toLowerCase()],
      },
      {
        mode: TransitMode.transit,
        Icon: TrainIcon,
        label: "Transit",
        duration: formatDuration(durationsByMode?.[TransitMode.transit]) || "",
        disabled: !durationsByMode?.[TransitMode.transit.toLowerCase()],
      },
      {
        mode: TransitMode.walking,
        Icon: WalkingIcon,
        label: "Walk",
        duration: formatDuration(durationsByMode?.[TransitMode.walking]) || "",
        disabled: !durationsByMode?.[TransitMode.walking.toLowerCase()],
      },
      {
        mode: TransitMode.bicycling,
        Icon: BikeIcon,
        label: "Bike",
        duration:
          formatDuration(durationsByMode?.[TransitMode.bicycling]) || "",
        disabled: !durationsByMode?.[TransitMode.bicycling.toLowerCase()],
      },
      {
        mode: TransitMode.shuttle,
        image: concordiaLogo,
        label: "Shuttle",
        duration:
          (isCrossCampus &&
            formatDuration(durationsByMode?.[TransitMode.shuttle])) ||
          "",
        disabled:
          !isCrossCampus ||
          !durationsByMode?.[TransitMode.shuttle.toLowerCase()],
      },
    ];

    if (isCrossCampus) {
      const shuttleOption = baseOptions.find(
        (option) => option.mode === TransitMode.shuttle,
      );
      const otherOptions = baseOptions.filter(
        (option) => option.mode !== TransitMode.shuttle,
      );
      return shuttleOption &&
        !!outdoorBlock?.directionsByMode[TransitMode.shuttle.toLowerCase()]
        ? [shuttleOption, ...otherOptions]
        : baseOptions;
    } else {
      return baseOptions.sort((option) => (option.disabled ? 1 : -1));
    }
  }, [isCrossCampus, durationsByMode]);

  useEffect(() => {
    const hasSelectedMode = transitOptions.some(
      (option) => option.mode === navigationState.transitMode,
    );

    if (
      hasSelectedMode &&
      transitOptions.find(
        (option) => option.mode === navigationState.transitMode,
      )?.disabled &&
      transitOptions.some((option) => !option.disabled)
    ) {
      navigationState.setTransitMode(
        transitOptions.find((option) => !option.disabled)?.mode,
      );
      return;
    }

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

  const areIndoorStepsPresent =
    navigationState.currentDirections?.directionBlocks.some(
      (block) => block.type === DirectionsResponseBlockType.INDOOR,
    );

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      onAnimate={handleSheetAnimate}
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
                  ? selectedOption.label
                  : "Please select a start location"}
              </Text>
              {!!navigationState.currentDirections &&
                !!selectedOption.duration && (
                  <Text style={NavigationBottomSheetStyles.transitModeDuration}>
                    {selectedOption.duration}
                  </Text>
                )}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              {areIndoorStepsPresent && (
                <AccessibilityToggle
                  isActive={mapSettings.preferAccessibleRoutes}
                  onToggle={handleToggleAccessibility}
                  isNavigationBottomSheet
                />
              )}
              <StartNavigationButton disabled={isError || isLoading} />
              <TouchableOpacity
                onPress={handleCloseSheet}
                style={NavigationBottomSheetStyles.closeIcon}
                testID="close-navigation"
                accessibilityLabel="Close navigation"
                accessibilityRole="button"
              >
                <CloseIcon size={28} />
              </TouchableOpacity>
            </View>
          </View>

          {isLoading && (
            <View
              style={{ width: "100%", marginTop: 20, alignItems: "center" }}
            >
              <ActivityIndicator size="large" color={COLORS.conuRed} />
            </View>
          )}
          {isError && (
            <View
              style={{ width: "100%", marginTop: 20, alignItems: "center" }}
            >
              <Text style={NavigationBottomSheetStyles.errorText}>
                Error fetching directions. Please try a different location.
              </Text>
            </View>
          )}
          {!!navigationState.startLocation && !isLoading && !isError && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ overflow: "visible" }}
              contentContainerStyle={NavigationBottomSheetStyles.transitRow}
              nestedScrollEnabled={true}
            >
              {transitOptions.map(
                ({ mode, Icon, image, duration, disabled }) => {
                  const selected = navigationState.transitMode === mode;
                  let iconColor = COLORS.textPrimary;
                  if (selected) iconColor = "#fff";
                  if (disabled) iconColor = COLORS.textMuted;
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
                        <Icon size={18} color={iconColor} />
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
                },
              )}
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
          {!!navigationState.currentDirections && !isError && (
            <OutdoorNavigationSteps
              indoorDirectionBlocks={navigationState.currentDirections?.directionBlocks.filter(
                (block) => block.type === DirectionsResponseBlockType.INDOOR,
              )}
              outdoorDirections={
                navigationState.currentDirections.directionBlocks.find(
                  (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
                )?.directionsByMode[selectedOption.mode || ""]
              }
              outdoorDirectionSequenceNumber={
                navigationState.currentDirections.directionBlocks.find(
                  (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
                )?.sequenceNumber
              }
            />
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
}
