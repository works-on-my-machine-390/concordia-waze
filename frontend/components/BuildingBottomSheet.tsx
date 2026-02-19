import type { Building } from "@/hooks/queries/buildingQueries";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../app/constants";
import {
  CloseIcon,
  ElevatorIcon,
  FavoriteEmptyIcon,
  SlopeUpIcon,
  WheelchairIcon,
} from "../app/icons";
import BottomSheetListSection from "./BottomSheetListSection";
import BuildingGallery from "./BuildingGallery";
import OpeningHours from "./OpeningHours";

type Props = {
  buildingCode: string | null;
  onClose?: () => void;
  onStartNavigation?: (buildingCode: string) => void;
  isNavigationMode?: boolean;
};

type BottomSheetBuildingModel = {
  accessibilityMapping: {
    wheelchair: boolean;
    elevator: boolean;
    ramp: boolean;
  };
} & Building;

// Function to return the dizzy icon and message if no building info showsf
function EmptyBuildingState() {
  return (
    <View style={BuildingBottomSheetStyles.emptyStateContainer}>
      <Image
        source={require("../assets/images/icon-dizzy.png")}
        style={BuildingBottomSheetStyles.emptyStateImage}
        resizeMode="contain"
      />
      <Text style={BuildingBottomSheetStyles.emptyStateText}>
        No information available for this building
      </Text>
    </View>
  );
}

export default function BuildingBottomSheet(props: Readonly<Props>) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  const snapPoints = useMemo(() => {
    return props.isNavigationMode ? ["10%"] : ["20%", "70%"];
  }, [props.isNavigationMode]);

  useEffect(() => {
    if (props.isNavigationMode) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [props.isNavigationMode]);

  const getBuildingQuery = useGetBuildingDetails(props.buildingCode || "");

  const building: BottomSheetBuildingModel = useMemo(() => {
    if (getBuildingQuery.data && getBuildingQuery.isSuccess) {
      const isAccessibilityDataAvailable =
        getBuildingQuery.data.accessibility?.length > 0;

      const accessbilityMapping = isAccessibilityDataAvailable
        ? {
            wheelchair: getBuildingQuery.data.accessibility.includes(
              "Accessible entrance",
            ),
            elevator: getBuildingQuery.data.accessibility.includes(
              "Accessible building elevator",
            ),
            ramp: getBuildingQuery.data.accessibility.includes(
              "Accessibility ramp",
            ),
          }
        : { wheelchair: false, elevator: false, ramp: false };
      return {
        ...getBuildingQuery.data,
        accessibilityMapping: accessbilityMapping,
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
      building.metro_accessible && (
        <View
          key="metro"
          style={{
            alignItems: "center",
            gap: 1,
            display: "flex",
            flexDirection: "row",
            backgroundColor: "rgba(184, 219, 255, 0.65)",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 24,
          }}
        >
          <MaterialIcons name="subway" size={26} color="#0E4C92" />
          <Text
            style={{
              fontSize: 12,
              color: "#0E4C92",
              marginTop: -4,
              textAlign: "center",
            }}
          >
            Accessible by tunnel
          </Text>
        </View>
      ),
    ].filter(Boolean);
  }, [building?.accessibilityMapping]);

  const isLoading = getBuildingQuery.isLoading;
  const hasBuildingData = !!building && getBuildingQuery.isSuccess;

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
      backgroundStyle={BuildingBottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      {isLoading && (
        <View style={{ marginTop: 16 }}>
          <ActivityIndicator size="large" color={COLORS.maroon} />
        </View>
      )}
      {!isLoading &&
        (hasBuildingData ? (
          <>
            <View style={BuildingBottomSheetStyles.fakeHandleContainer}>
              <View style={BuildingBottomSheetStyles.fakeHandleBar} />
            </View>
            {/* Header */}
            <View style={BuildingBottomSheetStyles.headerContainer}>
              {!props.isNavigationMode && sheetOpen && (
                <TouchableOpacity
                  testID="get-directions-icon"
                  onPress={() => props.onStartNavigation?.(building.code)}
                >
                  <View style={BuildingBottomSheetStyles.floatingIcon}>
                    <MaterialIcons
                      name="directions"
                      size={58}
                      color={COLORS.background}
                      style={{
                        backgroundColor: COLORS.maroon,
                        borderRadius: 12,
                        padding: 4,
                      }}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {!props.isNavigationMode && (
                <View style={BuildingBottomSheetStyles.textContainer}>
                  <Text style={BuildingBottomSheetStyles.name}>
                    {building.long_name} ({building.code})
                  </Text>
                  <Text style={BuildingBottomSheetStyles.address}>
                    {building.address}
                  </Text>
                </View>
              )}

              <View
                style={[
                  BuildingBottomSheetStyles.iconsContainer,
                  props.isNavigationMode &&
                    BuildingBottomSheetStyles.iconsContainerNavMode,
                ]}
              >
                {!props.isNavigationMode && (
                  <View
                    style={
                      BuildingBottomSheetStyles.accessibilityIconsContainer
                    }
                  >
                    {accessibilityIcons}
                  </View>
                )}

                <View
                  style={BuildingBottomSheetStyles.accessibilityIconsContainer}
                >
                  {!props.isNavigationMode && (
                    <FavoriteEmptyIcon color={COLORS.maroon} />
                  )}
                  <TouchableOpacity
                    onPress={handleCloseSheet}
                    style={BuildingBottomSheetStyles.closeIcon}
                  >
                    <CloseIcon size={28} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Scrollable Content */}
            {!props.isNavigationMode && (
              <BottomSheetScrollView
                contentContainerStyle={BuildingBottomSheetStyles.scrollContent}
              >
                <OpeningHours openingHours={building.opening_hours} />
                <BuildingGallery buildingCode={building.code} />
                <BottomSheetListSection
                  title="Services"
                  items={building.services}
                />
                <BottomSheetListSection
                  title="Departments"
                  items={building.departments}
                />
                <BottomSheetListSection
                  title="Venues"
                  items={building.venues}
                />
              </BottomSheetScrollView>
            )}
          </>
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={BuildingBottomSheetStyles.scrollContent}
          >
            <EmptyBuildingState />
          </BottomSheetScrollView>
        ))}
    </BottomSheet>
  );
}

export const BuildingBottomSheetStyles = StyleSheet.create({
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
    paddingVertical: 16,
  },

  floatingIcon: {
    position: "absolute",
    top: -75,
    right: -10,
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

  iconsContainerNavMode: {
    marginTop: -12,
    justifyContent: "flex-end",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
