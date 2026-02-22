import type { Building } from "@/hooks/queries/buildingQueries";
import { CampusCode, useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../app/constants";
import {
  BikeIcon,
  CarIcon,
  CloseIcon,
  ElevatorIcon,
  FavoriteEmptyIcon,
  GetDirectionsIcon,
  SlopeUpIcon,
  TrainIcon,
  WalkingIcon,
  WheelchairIcon,
} from "../app/icons";
import BuildingGallery from "./BuildingGallery";

const concordiaLogo = require("../assets/images/concordia_logo.png");

// Reusable list section
function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.listContainer}>
      <Text style={styles.listTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.listItem}>
          {item}
        </Text>
      ))}
    </View>
  );
}

type Props = {
  buildingCode: string | null;
  onClose?: () => void;
  onStartNavigation?: (buildingCode: string) => void;
  isNavigationMode?: boolean;
  startCampus?: CampusCode;
  endCampus?: CampusCode;
};

type BottomSheetBuildingModel = {
  accessibilityMapping: {
    wheelchair: boolean;
    elevator: boolean;
    ramp: boolean;
  };
} & Building;

export const TransitMode = {
  CAR: "CAR",
  TRAIN: "TRAIN",
  WALK: "WALK",
  BIKE: "BIKE",
  SHUTTLE: "SHUTTLE"
} as const;
export type TransitMode = (typeof TransitMode)[keyof typeof TransitMode];

function EmptyBuildingState() {
  return (
    <View style={styles.emptyStateContainer}>
      <Image
        source={require("../assets/images/icon-dizzy.png")}
        style={styles.emptyStateImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyStateText}>
        No information available for this building
      </Text>
    </View>
  );
}

export default function BuildingBottomSheet(props: Readonly<Props>) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [transitMode, setTransitMode] = useState<TransitMode | null>(null);

  const snapPoints = useMemo(() => {
    return props.isNavigationMode ? ["20%"] : ["20%", "70%"];
  }, [props.isNavigationMode]);

  useEffect(() => {
    if (props.isNavigationMode) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [props.isNavigationMode]);

  const getBuildingQuery = useGetBuildingDetails(props.buildingCode || "");

  const building: BottomSheetBuildingModel = useMemo(() => {
    if (
      getBuildingQuery.data &&
      getBuildingQuery.isSuccess &&
      getBuildingQuery.data.accessibility
    ) {
      return {
        accessibilityMapping: {
          wheelchair: getBuildingQuery.data.accessibility.includes(
            "Accessible entrance",
          ),
          elevator: getBuildingQuery.data.accessibility.includes(
            "Accessible building elevator",
          ),
          ramp: getBuildingQuery.data.accessibility.includes(
            "Accessibility ramp",
          ),
        },
        ...getBuildingQuery.data,
      };
    }
  }, [getBuildingQuery.data]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index > -1) setSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    if (props.onClose) {
      props.onClose();
    }
  }, []);

  const accessibilityIcons = useMemo(() => {
    if (!building || !building.accessibilityMapping) return [];
    return [
      building.accessibilityMapping.wheelchair && (
        <WheelchairIcon key="wheelchair" color="#0E4C92" size={24} />
      ),
      building.accessibilityMapping.elevator && (
        <ElevatorIcon key="elevator" color="#0E4C92" size={30} />
      ),
      building.accessibilityMapping.ramp && (
        <SlopeUpIcon key="ramp" color="#0E4C92" size={30} />
      ),
    ].filter(Boolean);
  }, [building?.accessibilityMapping]);

  const hasBuildingData = !!building && getBuildingQuery.isSuccess;

  // Check if route is cross-campus
  const isCrossCampus = useMemo(() => {
    if (!props.isNavigationMode) return false;
    if (!props.startCampus || !props.endCampus) return false;
    
    return props.startCampus !== props.endCampus;
  }, [props.isNavigationMode, props.startCampus, props.endCampus]);

  // Reorder options (the shuttle is first if cross-campus)
  const transitOptions = useMemo(() => {
    const baseOptions = [
      { mode: TransitMode.CAR,     Icon: CarIcon,        label: 'Drive',   duration: '5 min' },
      { mode: TransitMode.TRAIN,   Icon: TrainIcon,      label: 'Transit', duration: '3 min' },
      { mode: TransitMode.WALK,    Icon: WalkingIcon,    label: 'Walk',    duration: '3 min' },
      { mode: TransitMode.BIKE,    Icon: BikeIcon,       label: 'Bike',    duration: '4 min' },
      { mode: TransitMode.SHUTTLE, image: concordiaLogo, label: 'Shuttle', duration: '2 min' },
    ];

    // if cross-campus, move shuttle to the front
    if (isCrossCampus) {
      const shuttleOption = baseOptions.find(o => o.mode === TransitMode.SHUTTLE);
      const otherOptions = baseOptions.filter(o => o.mode !== TransitMode.SHUTTLE);
      return shuttleOption ? [shuttleOption, ...otherOptions] : baseOptions;
    }
    return baseOptions;
  }, [isCrossCampus]);

  // Set default transit mode to the first option
  useEffect(() => {
    if (props.isNavigationMode && transitOptions.length > 0) {
      setTransitMode(transitOptions[0].mode);
    }
  }, [transitOptions, props.isNavigationMode]);

  const selectedOption = transitOptions.find((o) => o.mode === transitMode) || transitOptions[0];

  return (
    <BottomSheet
      handleComponent={null}
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={styles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      {hasBuildingData ? (
        <>
          <View style={styles.fakeHandleContainer}>
            <View style={styles.fakeHandleBar} />
          </View>
          {/* Header */}
          <View style={styles.headerContainer}>
            {!props.isNavigationMode && sheetOpen && (
              <TouchableOpacity onPress={() => props.onStartNavigation?.(building.code)}>
                <View style={styles.floatingIcon} testID="start-navigation">
                  <GetDirectionsIcon size={90} color={COLORS.maroon} />
                </View>
              </TouchableOpacity>
            )}

            {!props.isNavigationMode && (
              <View style={styles.textContainer}>
                <Text style={styles.name}>
                  {building.long_name} ({building.code})
                </Text>
                <Text style={styles.address}>{building.address}</Text>
              </View>
            )}

            {/* Navigation mode: title + transit selector */}
            {props.isNavigationMode && (
              <View style={styles.navModeContainer}>
                <View style={styles.navModeHeader}>
                  <Text style={styles.transitModeTitle}>{selectedOption.label}</Text>
                  <TouchableOpacity onPress={handleCloseSheet} style={styles.closeIcon}   testID="close-navigation" accessibilityLabel="Close navigation" accessibilityRole="button">
                    <CloseIcon size={28} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.transitRow}
                  nestedScrollEnabled={true}
                >
                  {transitOptions.map(({ mode, Icon, image, duration }) => {
                    const selected = transitMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.transitChip, selected && styles.transitChipSelected]}
                        onPress={() => setTransitMode(mode)}
                      >
                        {Icon ? (
                          <Icon size={18} color={selected ? '#fff' : COLORS.textPrimary} />
                        ) : (
                          <Image 
                            source={image} 
                            style={{ width: 18, height: 18 }}
                            resizeMode="contain"
                          />
                        )}
                        <Text style={[styles.transitChipText, selected && styles.transitChipTextSelected]}>
                          {duration}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Normal mode: accessibility + favorite + close */}
            {!props.isNavigationMode && (
              <View style={styles.iconsContainer}>
                <View style={styles.accessibilityIconsContainer}>
                  {accessibilityIcons}
                </View>
                <View style={styles.accessibilityIconsContainer}>
                  <FavoriteEmptyIcon color={COLORS.maroon} />
                  <TouchableOpacity onPress={handleCloseSheet} style={styles.closeIcon}>
                    <CloseIcon size={28} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Scrollable Content */}
          {!props.isNavigationMode && (
            <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
              <BuildingGallery buildingCode={building.code} />
              <ListSection title="Services" items={building.services} />
              <ListSection title="Departments" items={building.departments} />
              <ListSection title="Venues" items={building.venues} />
            </BottomSheetScrollView>
          )}
        </>
      ) : (
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          <EmptyBuildingState />
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: COLORS.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },

  fakeHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingTop: 8,
  },

  fakeHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },

  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  floatingIcon: {
    position: "absolute",
    top: -88,
    right: -20,
    zIndex: 10,
    borderRadius: 20,
    padding: 6,
  },

  textContainer: {
    alignItems: "flex-start",
    justifyContent: "center",
  },

  name: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
    color: COLORS.textPrimary,
  },

  address: {
    fontSize: 14,
    marginBottom: 4,
    color: COLORS.textSecondary,
  },

  iconsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  accessibilityIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  closeIcon: {
    marginLeft: 7,
  },

  // Navigation mode styles
  navModeContainer: {
    gap: 10,
  },

  navModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  transitModeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  transitRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },

  transitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },

  transitChipSelected: {
    backgroundColor: COLORS.maroon,
  },

  transitChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  transitChipTextSelected: {
    color: '#fff',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  listContainer: {
    marginBottom: 20,
    backgroundColor: "#f2f2f2",
    padding: 10,
    width: "100%",
    borderRadius: 8,
  },

  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: COLORS.textPrimary,
  },

  listItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  gallerySkeleton: {
    marginBottom: 16,
    borderRadius: 12,
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