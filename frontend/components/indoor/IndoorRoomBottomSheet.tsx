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

export type IndoorRoomBottomSheetProps = {
  roomCode: string;
  buildingCode: string;
  floorNumber: number;
  coordX: number;
  coordY: number;
  roomType?: string | null;
  onClose: () => void;
  onDirectionsPress?: () => void;
  directionsDisabled?: boolean;
};

const DEFAULT_GUEST_USER_ID = "guest";

export default function IndoorRoomBottomSheet(
  props: Readonly<IndoorRoomBottomSheetProps>,
) {
  const {
    roomCode,
    buildingCode,
    floorNumber,
    coordX,
    coordY,
    roomType,
    onClose,
    onDirectionsPress,
    directionsDisabled = false,
  } = props;

  const profileQuery = useGetProfile();
  const favoriteUserId = profileQuery.data?.id || DEFAULT_GUEST_USER_ID;
  const createFavorite = useCreateFavorite(favoriteUserId);
  const deleteFavorite = useDeleteFavorite(favoriteUserId);
  const favoritesQuery = useGetUserFavorites(favoriteUserId, true);

  const snapPoints = useMemo(() => ["15%"], []);
  const handleSheetChanges = useCallback((_index: number) => {}, []);

  const isRoom = roomType?.toLowerCase() === "room";

  const displayTitle = formatIndoorPoiName(
    roomCode,
    roomType ?? "",
    buildingCode,
  );

  const displaySubtitle = isRoom ? "Room" : null;
  const canPressDirections = !directionsDisabled && !!onDirectionsPress;

  const existingFavorite = useMemo(
    () =>
      (favoritesQuery.data || []).find(
        (favorite) =>
          favorite.type === "indoor" &&
          favorite.buildingCode === buildingCode &&
          favorite.floorNumber === floorNumber &&
          favorite.x === coordX &&
          favorite.y === coordY,
      ),
    [buildingCode, coordX, coordY, favoritesQuery.data, floorNumber],
  );

  const handleAddFavorite = () => {
    if (existingFavorite) {
      deleteFavorite.mutate(existingFavorite.id);
      return;
    }

    createFavorite.mutate({
      type: "indoor",
      name: roomCode,
      buildingCode,
      floorNumber,
      x: coordX,
      y: coordY,
      poiType: roomType || undefined,
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
      <View style={BottomSheetStyles.fakeHandleContainer}>
        <View style={BottomSheetStyles.fakeHandleBar} />
      </View>

      <View style={BottomSheetStyles.headerContainer}>
        <TouchableOpacity
          testID="indoor-room-navigate-button"
          onPress={() => {
            if (canPressDirections && onDirectionsPress) {
              onDirectionsPress();
            }
            onClose();
          }}
          disabled={directionsDisabled}
          activeOpacity={0.8}
        >
          <View
            style={[
              BottomSheetStyles.floatingIcon,
              directionsDisabled && styles.disabledFloating,
            ]}
          >
            <GetDirectionsIcon
              size={90}
              color={directionsDisabled ? "#BDBDBD" : COLORS.maroon}
            />
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
            onPress={onClose}
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

const styles = StyleSheet.create({
  disabledFloating: {
    opacity: 0.6,
  },
});
