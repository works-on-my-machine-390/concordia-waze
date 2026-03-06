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
import { formatIndoorPoiName } from "../../app/utils/indoorNameFormattingUtils";

export type IndoorRoomBottomSheetProps = {
  roomCode: string;
  buildingCode: string;
  roomType?: string | null;
  onClose: () => void;
  onDirectionsPress?: () => void;
  directionsDisabled?: boolean;
};

export default function IndoorRoomBottomSheet(
  props: Readonly<IndoorRoomBottomSheetProps>,
) {
  const {
    roomCode,
    buildingCode,
    roomType,
    onClose,
    onDirectionsPress,
    directionsDisabled = false,
  } = props;

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
              color={!directionsDisabled ? COLORS.maroon : "#BDBDBD"}
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
          <TouchableOpacity testID="indoor-room-favorite-button">
            <FavoriteEmptyIcon color={COLORS.maroon} />
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