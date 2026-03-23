import type { Building } from "@/hooks/queries/buildingQueries";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import {
  useCreateFavorite,
  useDeleteFavorite,
  useGetUserFavorites,
} from "@/hooks/queries/favoritesQueries";
import { useSaveToHistory } from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import useStartLocation from "@/hooks/useStartLocation";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BUILDINGS_WITH_INDOOR_MAPS, COLORS } from "../app/constants";
import {
  CloseIcon,
  ElevatorIcon,
  FavoriteEmptyIcon,
  FavoriteFilledIcon,
  GetDirectionsIcon,
  SlopeUpIcon,
  WheelchairIcon,
} from "../app/icons";
import ListSection from "./BottomSheetListSection";
import BuildingGallery from "./BuildingGallery";
import MetroAccessibleChip from "./MetroAccessibleChip";
import OpeningHours from "./OpeningHours";
import ViewIndoorMapButton from "./ViewIndoorMapButton";

export type BuildingBottomSheetProps = {};

const DEFAULT_GUEST_USER_ID = "guest";

type BottomSheetBuildingModel = {
  accessibilityMapping: {
    wheelchair: boolean;
    elevator: boolean;
    ramp: boolean;
  };
} & Building;

function EmptyBuildingState() {
  return (
    <View style={BottomSheetStyles.emptyStateContainer}>
      <Image
        source={require("../assets/images/icon-dizzy.png")}
        style={BottomSheetStyles.emptyStateImage}
        resizeMode="contain"
      />
      <Text style={BottomSheetStyles.emptyStateText}>
        No information available for this building
      </Text>
    </View>
  );
}

export default function BuildingBottomSheet(
  props: Readonly<BuildingBottomSheetProps>,
) {
  const [sheetOpen, setSheetOpen] = useState(true);

  const mapState = useMapStore();

  const { findAndSetStartLocation } = useStartLocation();

  const userProfileQuery = useGetProfile();
  const favoriteUserId = userProfileQuery.data?.id || DEFAULT_GUEST_USER_ID;
  const createFavorite = useCreateFavorite(favoriteUserId);
  const deleteFavorite = useDeleteFavorite(favoriteUserId);
  const favoritesQuery = useGetUserFavorites(favoriteUserId, true);

  const saveToHistory = useSaveToHistory(userProfileQuery.data?.id || "");

  const snapPoints = useMemo(() => ["20%", "70%"], []);

  const getBuildingQuery = useGetBuildingDetails(
    mapState.selectedBuildingCode || "",
  );

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
        accessibilityMapping: accessbilityMapping,
        ...getBuildingQuery.data,
      };
    }
  }, [getBuildingQuery.data]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index > -1) setSheetOpen(true);
  }, []);

  const accessibilityIcons = useMemo(() => {
    if (!building?.accessibilityMapping) return [];
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
      building.metro_accessible && <MetroAccessibleChip key={"metro-access"} />,
    ].filter(Boolean);
  }, [building?.accessibilityMapping]);

  const isLoading = getBuildingQuery.isLoading;
  const hasBuildingData = !!building && getBuildingQuery.isSuccess;
  const hasIndoorMap =
    hasBuildingData &&
    BUILDINGS_WITH_INDOOR_MAPS.includes(building.code as any);

  const existingFavorite = useMemo(() => {
    if (!building) return undefined;

    return (favoritesQuery.data || []).find((favorite) => {
      const matchesName = favorite.name === building.long_name;
      const matchesCoords =
        favorite.type === "outdoor" &&
        favorite.latitude === building.latitude &&
        favorite.longitude === building.longitude;

      return matchesName || matchesCoords;
    });
  }, [building, favoritesQuery.data]);

  const navigationState = useNavigationStore();
  const handleStartNavigation = async () => {
    const endLocation = {
      latitude: building.latitude,
      longitude: building.longitude,
      name: building.long_name,
      code: building.code,
      address: building.address,
    };

    navigationState.setEndLocation(endLocation);
    mapState.setCurrentMode(MapMode.NAVIGATION);

    if (userProfileQuery.data?.id) {
      saveToHistory.mutate({
        name: building.long_name,
        address: building.address,
        lat: building.latitude,
        lng: building.longitude,
        building_code: building.code,
        destinationType: "building",
      });
    }

    findAndSetStartLocation(endLocation);
    navigationState.setNavigationPhase(NavigationPhase.PREPARATION);
  };

  const handleAddFavorite = () => {
    if (!building) return;

    if (existingFavorite) {
      deleteFavorite.mutate(existingFavorite.id);
      return;
    }

    createFavorite.mutate({
      type: "outdoor",
      name: building.long_name,
      latitude: building.latitude,
      longitude: building.longitude,
    });
  };

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      {isLoading && (
        <View style={{ marginTop: 16 }}>
          <ActivityIndicator size="large" color={COLORS.maroon} />
        </View>
      )}

      {!isLoading && hasBuildingData && (
        <>
          <View style={BottomSheetStyles.fakeHandleContainer}>
            <View style={BottomSheetStyles.fakeHandleBar} />
          </View>
          {/* Header */}
          <View style={BottomSheetStyles.headerContainer}>
            {sheetOpen && (
              <>
                <TouchableOpacity
                  onPress={handleStartNavigation}
                  testID="start-navigation"
                >
                  <View style={BottomSheetStyles.floatingIcon}>
                    <GetDirectionsIcon size={90} color={COLORS.maroon} />
                  </View>
                </TouchableOpacity>

                {hasIndoorMap && (
                  <View style={BottomSheetStyles.indoorMapButton}>
                    <ViewIndoorMapButton buildingCode={building.code} />
                  </View>
                )}
              </>
            )}

            <View style={BottomSheetStyles.textContainer}>
              <Text style={BottomSheetStyles.name}>
                {building.long_name} ({building.code})
              </Text>
              <Text style={BottomSheetStyles.address}>{building.address}</Text>
            </View>

            <View style={BottomSheetStyles.iconsContainer}>
              <View style={BottomSheetStyles.accessibilityIconsContainer}>
                {accessibilityIcons}
              </View>
              <View style={BottomSheetStyles.accessibilityIconsContainer}>
                <TouchableOpacity
                  onPress={handleAddFavorite}
                  testID="building-favorite-button"
                >
                  {existingFavorite ? (
                    <FavoriteFilledIcon color={COLORS.maroon} />
                  ) : (
                    <FavoriteEmptyIcon color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    mapState.setSelectedBuildingCode(null);
                    mapState.closeSheet();
                  }}
                  style={BottomSheetStyles.closeIcon}
                >
                  <CloseIcon size={28} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Scrollable Content */}
          <BottomSheetScrollView
            contentContainerStyle={BottomSheetStyles.scrollContent}
          >
            <OpeningHours openingHours={building.opening_hours} />
            <BuildingGallery buildingCode={building.code} />
            <ListSection title="Services" items={building.services} />
            <ListSection title="Departments" items={building.departments} />
            <ListSection title="Venues" items={building.venues} />
          </BottomSheetScrollView>
        </>
      )}
      {!isLoading && !hasBuildingData && (
        <BottomSheetScrollView
          contentContainerStyle={BottomSheetStyles.scrollContent}
        >
          <EmptyBuildingState />
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
}

export const BottomSheetStyles = StyleSheet.create({
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

  indoorMapButton: {
    position: "absolute",
    top: -88,
    left: 10,
    zIndex: 10,
  },
});
