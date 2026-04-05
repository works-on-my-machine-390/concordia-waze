import BottomSheet from "@gorhom/bottom-sheet";
import {
  useCreateFavorite,
  useDeleteFavorite,
  useGetUserFavorites,
} from "@/hooks/queries/favoritesQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../app/constants";
import {
  CloseIcon,
  FavoriteEmptyIcon,
  FavoriteFilledIcon,
  GetDirectionsIcon,
} from "../../app/icons";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import { formatIndoorPoiName } from "../../app/utils/indoorNameFormattingUtils";
import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { useLocalSearchParams } from "expo-router";
import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";
import { useQueryClient } from "@tanstack/react-query";
import { Building } from "@/hooks/queries/buildingQueries";
import useStartLocation from "@/hooks/useStartLocation";
import { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";

export type IndoorRoomBottomSheetProps = {
  selectedPoi: PointOfInterest;
  onClose: () => void;
};

const DEFAULT_GUEST_USER_ID = "guest";

export default function IndoorRoomBottomSheet(
  props: Readonly<IndoorRoomBottomSheetProps>,
) {
  const setMapMode = useMapStore((state) => state.setCurrentMode);
  const queryClient = useQueryClient();
  const { findAndSetStartLocation } = useStartLocation();

  const navigationState = useNavigationStore(); // link to global navigation (not just indoors)
  const params = useLocalSearchParams<IndoorMapPageParams>();

  const profileQuery = useGetProfile();
  const favoriteUserId = profileQuery.data?.id || DEFAULT_GUEST_USER_ID;
  const createFavorite = useCreateFavorite(favoriteUserId);
  const deleteFavorite = useDeleteFavorite(favoriteUserId);
  const favoritesQuery = useGetUserFavorites(favoriteUserId, true);

  const snapPoints = useMemo(() => ["15%"], []);
  const handleSheetChanges = useCallback((_index: number) => {}, []);

  const isRoom = props.selectedPoi.type?.toLowerCase() === "room";

  const displayTitle = formatIndoorPoiName(
    props.selectedPoi.name,
    props.selectedPoi.type ?? "",
    params.buildingCode,
  );

  const displaySubtitle = isRoom ? "Room" : null;

  const handleNavigatePress = () => {
    const buildingData: Building | undefined =
      queryClient.getQueryData<Building>([
        "buildingDetails",
        params.buildingCode,
      ]);

    const endLocation = {
      building: params.buildingCode,
      floor_number: Number.parseInt(params.selectedFloor),
      indoor_position: props.selectedPoi.position,
      code: params.buildingCode,
      name: displayTitle,
      latitude: buildingData?.latitude ?? 0,
      longitude: buildingData?.longitude ?? 0,
    };

    if (!navigationState.startLocation) {
      findAndSetStartLocation(endLocation);
    }

    navigationState.setEndLocation(endLocation);

    setMapMode(MapMode.NAVIGATION);
    navigationState.setNavigationPhase(NavigationPhase.PREPARATION);
    props.onClose?.();
  };

  const existingFavorite = useMemo(
    () =>
      (favoritesQuery.data || []).find(
        (favorite) =>
          favorite.type === "indoor" &&
          favorite.buildingCode === params.buildingCode &&
          favorite.floorNumber === Number.parseInt(params.selectedFloor) &&
          favorite.x === props.selectedPoi.position.x &&
          favorite.y === props.selectedPoi.position.y,
      ),
    [params.buildingCode, props.selectedPoi.position.x, props.selectedPoi.position.y, favoritesQuery.data, params.selectedFloor],
  );

  const handleAddFavorite = () => {
    if (existingFavorite) {
      deleteFavorite.mutate(existingFavorite.id);
      return;
    }

    createFavorite.mutate({
      type: "indoor",
      name: props.selectedPoi.name,
      buildingCode: params.buildingCode,
      floorNumber: Number.parseInt(params.selectedFloor),
      x: props.selectedPoi.position.x,
      y: props.selectedPoi.position.y,
      poiType: props.selectedPoi.type || undefined,
    });
  };

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={false}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}></View>

      <View style={BottomSheetStyles.headerContainer}>
        <TouchableOpacity
          testID="indoor-room-navigate-button"
          onPress={handleNavigatePress}
          activeOpacity={0.8}
        >
          <View style={[BottomSheetStyles.floatingIcon]}>
            <GetDirectionsIcon size={90} color={COLORS.maroon} />
          </View>
        </TouchableOpacity>

        <View style={BottomSheetStyles.textContainer}>
          <Text style={BottomSheetStyles.name}>{displayTitle}</Text>
          {!!displaySubtitle && (
            <Text style={IndoorRoomStyles.roomType}>{displaySubtitle}</Text>
          )}
        </View>

        <View style={IndoorRoomStyles.iconsContainer}>
          <TouchableOpacity
            testID="indoor-room-favorite-button"
            onPress={handleAddFavorite}
          >
            {existingFavorite ? (
              <FavoriteFilledIcon color={COLORS.maroon} />
            ) : (
              <FavoriteEmptyIcon color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={props.onClose}
            style={BottomSheetStyles.closeIcon}
            testID="indoor-room-close-button"
          >
            <View testID="close-icon">
              <CloseIcon size={28} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const IndoorRoomStyles = StyleSheet.create({
  iconsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingRight: 10,
  },
  roomType: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: "capitalize",
  },
});
