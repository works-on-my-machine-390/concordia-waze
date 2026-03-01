import { getIsCrossCampus } from "@/app/utils/mapUtils";
import { useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import BottomSheet from "@gorhom/bottom-sheet";
import { useEffect, useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { COLORS } from "../app/constants";
import {
  BikeIcon,
  CarIcon,
  CloseIcon,
  TrainIcon,
  WalkingIcon,
} from "../app/icons";

const concordiaLogo = require("../assets/images/concordia_logo.png");

export const TransitMode = {
  DRIVING: "DRIVING",
  TRANSIT: "TRANSIT",
  WALKING: "WALKING",
  BICYCLING: "BICYCLING",
  SHUTTLE: "SHUTTLE",
} as const;

export type TransitMode = (typeof TransitMode)[keyof typeof TransitMode];

export type NavigationBottomSheetProps = {};

export default function NavigationBottomSheet(
  props: Readonly<NavigationBottomSheetProps>,
) {
  const closeSheet = useMapStore((state) => state.closeSheet);

  const navigationState = useNavigationStore();

  const isCrossCampus = useMemo(() => {
    if (!navigationState.startLocation || !navigationState.endLocation)
      return false;
    return getIsCrossCampus(
      navigationState.startLocation,
      navigationState.endLocation,
    );
  }, [navigationState.startLocation, navigationState.endLocation]);

  const transitOptions = useMemo(() => {
    const baseOptions = [
      {
        mode: TransitMode.DRIVING,
        Icon: CarIcon,
        label: "Drive",
        duration: "5 min",
      },
      {
        mode: TransitMode.TRANSIT,
        Icon: TrainIcon,
        label: "Transit",
        duration: "3 min",
      },
      {
        mode: TransitMode.WALKING,
        Icon: WalkingIcon,
        label: "Walk",
        duration: "3 min",
      },
      {
        mode: TransitMode.BICYCLING,
        Icon: BikeIcon,
        label: "Bike",
        duration: "4 min",
      },
      {
        mode: TransitMode.SHUTTLE,
        image: concordiaLogo,
        label: "Shuttle",
        duration: "2 min",
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
  }, [isCrossCampus]);

  useEffect(() => {
    if (transitOptions.length > 0) {
      navigationState.setTransitMode(transitOptions[0].mode);
      
    }
  }, [transitOptions]);

  const selectedOption =
    transitOptions.find((option) => option.mode === navigationState.transitMode) ||
    transitOptions[0];

  const snapPoints = useMemo(() => {
    if (!navigationState.startLocation) return ["14%"];
    return ["20%"];
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
      <>
        <View style={NavigationBottomSheetStyles.fakeHandleContainer}>
          <View style={NavigationBottomSheetStyles.fakeHandleBar} />
        </View>
        <View style={NavigationBottomSheetStyles.headerContainer}>
          <View style={NavigationBottomSheetStyles.navModeContainer}>
            <View style={NavigationBottomSheetStyles.navModeHeader}>
              <Text style={NavigationBottomSheetStyles.transitModeTitle}>
                {navigationState.startLocation
                  ? selectedOption.label
                  : "Please select a start location"}
              </Text>
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
                contentContainerStyle={NavigationBottomSheetStyles.transitRow}
                nestedScrollEnabled={true}
              >
                {transitOptions.map(({ mode, Icon, image, duration }) => {
                  const selected = navigationState.transitMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        NavigationBottomSheetStyles.transitChip,
                        selected &&
                          NavigationBottomSheetStyles.transitChipSelected,
                      ]}
                      onPress={() => navigationState.setTransitMode(mode)}
                    >
                      {Icon ? (
                        <Icon
                          size={18}
                          color={selected ? "#fff" : COLORS.textPrimary}
                        />
                      ) : (
                        <Image
                          source={image}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      )}
                      <Text
                        style={[
                          NavigationBottomSheetStyles.transitChipText,
                          selected &&
                            NavigationBottomSheetStyles.transitChipTextSelected,
                        ]}
                      >
                        {duration}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </>
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

  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  navModeContainer: {
    gap: 10,
  },

  navModeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  transitModeTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  transitRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
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

  transitChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  transitChipTextSelected: {
    color: "#fff",
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
