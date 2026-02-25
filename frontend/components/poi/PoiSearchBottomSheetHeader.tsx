import { COLORS } from "@/app/constants";
import { CloseIcon } from "@/app/icons";
import { Text, View, Pressable, TouchableOpacity, Animated } from "react-native";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import { poiMiscStyles } from "@/app/styles/poi/poiStyle";
import { useEffect, useRef } from "react";

export type PoiSearchBottomSheetHeaderProps = {
  onClose?: () => void;
  areParamsDifferent: boolean;
  onUpdateParams: () => void;
};

export default function PoiSearchBottomSheetHeader(
  props: Readonly<PoiSearchBottomSheetHeaderProps>,
) {
  const updateButtonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (props.areParamsDifferent) {
      updateButtonOpacity.setValue(0);
      Animated.timing(updateButtonOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [props.areParamsDifferent, updateButtonOpacity]);

  return (
    <View
      style={[
        BottomSheetStyles.headerContainer,
        {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        },
      ]}
    >
      <View style={BottomSheetStyles.textContainer}>
        <Text style={BottomSheetStyles.name}>Nearby results</Text>
      </View>

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        {props.areParamsDifferent && (
          <Animated.View style={{ opacity: updateButtonOpacity }}>
            <Pressable
              onPress={props.onUpdateParams}
              style={poiMiscStyles.updateButton}
            >
              <Text style={{ color: COLORS.selectionBlue }}>Update results</Text>
            </Pressable>
          </Animated.View>
        )}

        <TouchableOpacity
          onPress={props.onClose}
          style={BottomSheetStyles.closeIcon}
        >
          <CloseIcon size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
