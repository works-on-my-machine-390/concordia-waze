import { CloseIcon } from "@/app/icons";
import {
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { BottomSheetStyles } from "../BuildingBottomSheet";

export type PoiSearchBottomSheetHeaderProps = {
  onClose?: () => void;
};

export default function PoiSearchBottomSheetHeader(
  props: Readonly<PoiSearchBottomSheetHeaderProps>,
) {
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
