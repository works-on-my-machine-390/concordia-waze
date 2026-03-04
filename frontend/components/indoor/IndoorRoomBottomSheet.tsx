import BottomSheet from "@gorhom/bottom-sheet";
import { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../app/constants";
import {
  CloseIcon,
  FavoriteEmptyIcon,
  GetDirectionsIcon,
} from "../../app/icons";
import { BottomSheetStyles } from "../BuildingBottomSheet";

export type IndoorRoomBottomSheetProps = {
  roomCode: string;
  buildingCode: string;
  roomType?: string | null;
  onClose: () => void;
};

export default function IndoorRoomBottomSheet(
  props: Readonly<IndoorRoomBottomSheetProps>,
) {
  const { roomCode, buildingCode, roomType, onClose } = props;

  const snapPoints = useMemo(() => ["15%", "50%"], []);
  const handleSheetChanges = useCallback((_index: number) => {}, []);

  const isRoom = roomType?.toLowerCase() === "room";

  const isNumericRoom = /^Room\s*\d+/i.test(roomCode);
  const displayRoomCode = isNumericRoom
    ? `${buildingCode}${roomCode.replace(/^Room\s*/i, "")}`
    : roomCode;

  const displayTitle = isRoom
    ? displayRoomCode
    : (roomType
        ? roomType.charAt(0).toUpperCase() + roomType.slice(1).toLowerCase()
        : roomCode);

  const displaySubtitle = isRoom ? "Room" : null;

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
        {/* Floating navigate button */}
        <TouchableOpacity testID="indoor-room-navigate-button">
          <View style={BottomSheetStyles.floatingIcon}>
            <GetDirectionsIcon size={90} color={COLORS.maroon} />
          </View>
        </TouchableOpacity>

        {/* Title + optional subtitle */}
        <View style={BottomSheetStyles.textContainer}>
          <Text style={BottomSheetStyles.name}>{displayTitle}</Text>
          {!!displaySubtitle && (
            <Text style={IndoorRoomStyles.roomType}>{displaySubtitle}</Text>
          )}
        </View>

        {/* Bottom row: favourite + close on right */}
        <View style={IndoorRoomStyles.iconsContainer}>
          <TouchableOpacity testID="indoor-room-favorite-button">
            <FavoriteEmptyIcon color={COLORS.maroon} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={BottomSheetStyles.closeIcon}
            testID="indoor-room-close-button"
          >
            <CloseIcon size={28} />
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